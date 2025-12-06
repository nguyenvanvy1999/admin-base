import dayjs from 'dayjs';
import { authenticator } from 'otplib';
import {
  type ILoginRateLimitCache,
  type IMFACache,
  type IRegisterRateLimitCache,
  loginRateLimitCache,
  mfaCache,
  mfaSetupTokenByUserCache,
  mfaSetupTokenCache,
  registerRateLimitCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { SecurityEventType, type User, UserStatus } from 'src/generated';
import type {
  ChangePasswordRequestDto,
  ConfirmMfaLoginRequestDto,
  ForgotPasswordRequestDto,
  ILoginRes,
  ILoginResponse,
  LoginMFAResDto,
  LoginMFASetupResDto,
  LoginRequestDto,
  MfaLoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  VerifyAccountRequestDto,
} from 'src/modules/auth';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  type ReferralService,
  referralService,
} from 'src/service/misc/referral.service';
import {
  type SecurityEventService,
  securityEventService,
} from 'src/service/misc/security-event.service';
import {
  type SettingService,
  settingService,
} from 'src/service/misc/setting.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  DB_PREFIX,
  defaultRoles,
  ErrCode,
  getIpAndUa,
  IdUtil,
  type ITokenPayload,
  isExpired,
  LoginResType,
  NotFoundErr,
  normalizeEmail,
  type PrismaTx,
  PurposeVerify,
  UnAuthErr,
  userResSelect,
} from 'src/share';
import {
  type TokenService,
  tokenService,
  type UserUtilService,
  userUtilService,
} from './auth-util.service';
import { type MfaUtilService, mfaUtilService } from './mfa-util.service';
import {
  type MfaVerificationService,
  mfaVerificationService,
} from './mfa-verification.service';
import { type OtpService, otpService } from './otp.service';
import { type PasswordService, passwordService } from './password.service';
import {
  type PasswordValidationService,
  passwordValidationService,
} from './password-validation.service';
import {
  type SecurityCheckResult,
  type SecurityMonitorService,
  securityMonitorService,
} from './security-monitor.service';
import { type SessionService, sessionService } from './session.service';

type LoginParams = typeof LoginRequestDto.static;
type RegisterParams = typeof RegisterRequestDto.static;
type ChangePasswordParams = {
  userId: string;
} & typeof ChangePasswordRequestDto.static;
type ForgotPasswordParams = typeof ForgotPasswordRequestDto.static;
type VerifyAccountParams = typeof VerifyAccountRequestDto.static;
type RefreshTokenParams = typeof RefreshTokenRequestDto.static;
type LogoutParams = { id: string; sessionId: string };
type ConfirmMfaLoginParams = typeof ConfirmMfaLoginRequestDto.static;
type LoginWithMfaParams = typeof MfaLoginRequestDto.static;

export class AuthService {
  constructor(
    private readonly deps: {
      db: IDb;
      env: IEnv;
      passwordService: PasswordService;
      passwordValidationService: PasswordValidationService;
      tokenService: TokenService;
      mfaUtilService: MfaUtilService;
      otpService: OtpService;
      sessionService: SessionService;
      settingService: SettingService;
      auditLogService: AuditLogService;
      securityEventService: SecurityEventService;
      referralService: ReferralService;
      userUtilService: UserUtilService;
      loginRateLimitCache: ILoginRateLimitCache;
      registerRateLimitCache: IRegisterRateLimitCache;
      mfaCache: IMFACache;
      authenticator: typeof authenticator;
      securityMonitorService: SecurityMonitorService;
      mfaVerificationService: MfaVerificationService;
    } = {
      db,
      env,
      passwordService,
      passwordValidationService,
      tokenService,
      mfaUtilService,
      otpService,
      sessionService,
      settingService,
      auditLogService,
      securityEventService,
      referralService,
      userUtilService,
      loginRateLimitCache,
      registerRateLimitCache,
      mfaCache,
      authenticator,
      securityMonitorService,
      mfaVerificationService,
    },
  ) {}

  async login(params: LoginParams): Promise<ILoginResponse> {
    const { email, password } = params;
    const { clientIp, userAgent } = getIpAndUa();

    await this.checkRateLimit(email, clientIp);

    const user = await this.findAndValidateUser(email);

    const { enbAttempt, enbExpired } =
      await this.deps.settingService.password();

    this.validatePasswordAttempts(user, enbAttempt);

    const passwordValid = await this.validatePasswordAndAttempts(
      password,
      user,
    );
    if (!passwordValid) {
      await Promise.all([
        this.deps.auditLogService.push({
          type: ACTIVITY_TYPE.LOGIN,
          payload: { method: 'email', error: 'password_mismatch' },
        }),
        this.deps.securityEventService.create({
          userId: user.id,
          eventType: SecurityEventType.login_failed,
          ip: clientIp,
          userAgent,
          metadata: { method: 'email', reason: 'password_mismatch' },
        }),
      ]);
      throw new BadReqErr(ErrCode.PasswordNotMatch);
    }

    if (user.status !== UserStatus.active) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: 'email', error: 'user_not_active' },
      });
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    this.validatePasswordExpiration(user, enbExpired);

    const securityResult = await this.deps.securityMonitorService.evaluateLogin(
      {
        userId: user.id,
        method: 'email',
      },
    );

    if (securityResult.action === 'block') {
      await Promise.all([
        this.deps.auditLogService.push({
          type: ACTIVITY_TYPE.LOGIN,
          payload: { method: 'email', error: 'security_blocked' },
        }),
        this.deps.securityEventService.create({
          userId: user.id,
          eventType: SecurityEventType.login_failed,
          ip: clientIp,
          userAgent,
          metadata: { method: 'email', reason: 'security_blocked' },
        }),
      ]);
      throw new BadReqErr(ErrCode.SuspiciousLoginBlocked);
    }

    if (!user.mfaTotpEnabled) {
      const mfaRequired = await this.deps.settingService.enbMfaRequired();
      if (mfaRequired) {
        return this.handleMfaSetupRequired(user, securityResult);
      }
    } else {
      return this.handleMfaLogin(user, securityResult);
    }

    return this.handleSuccessfulLogin(
      user,
      clientIp,
      userAgent,
      securityResult,
    );
  }

  private async checkRateLimit(email: string, clientIp: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const rateLimitKey = `login:${clientIp}:${normalizedEmail}`;
    const currentAttempts =
      (await this.deps.loginRateLimitCache.get(rateLimitKey)) ?? 0;

    const { max, windowSeconds } =
      await this.deps.settingService.loginRateLimit();

    if (currentAttempts >= max) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: 'email', error: 'rate_limit_exceeded' },
      });
      throw new BadReqErr(ErrCode.BadRequest, {
        errors: 'Too many login attempts. Please try again later.',
      });
    }

    await this.deps.loginRateLimitCache.set(
      rateLimitKey,
      currentAttempts + 1,
      windowSeconds,
    );
  }

  async checkRegisterRateLimit(email: string, clientIp: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const rateLimitKey = `register:${clientIp}:${normalizedEmail}`;
    const currentAttempts =
      (await this.deps.registerRateLimitCache.get(rateLimitKey)) ?? 0;

    const { max, windowSeconds } =
      await this.deps.settingService.registerRateLimit();

    if (currentAttempts >= max) {
      await this.logRegisterRateLimitViolation(normalizedEmail);
      throw new BadReqErr(ErrCode.BadRequest, {
        errors: 'Too many registration attempts. Please try again later.',
      });
    }

    await this.deps.registerRateLimitCache.set(
      rateLimitKey,
      currentAttempts + 1,
      windowSeconds,
    );
  }

  private async findAndValidateUser(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (!user || !user.password) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    return user;
  }

  private async validatePasswordAndAttempts(
    password: string,
    user: { id: string; password: string },
  ): Promise<boolean> {
    const match = await this.deps.passwordService.comparePassword(
      password,
      user.password,
    );

    if (!match) {
      await this.deps.passwordService.increasePasswordAttempt(user.id);
      return false;
    }

    return true;
  }

  private async handleSuccessfulLogin(
    user: Parameters<typeof this.deps.userUtilService.completeLogin>[0],
    clientIp: string,
    userAgent: string,
    security?: SecurityCheckResult,
  ): Promise<ILoginResponse> {
    const loginRes = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
      security,
    );

    await Promise.all([
      this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: 'email' },
      }),
      this.deps.securityEventService.create({
        userId: user.id,
        eventType: SecurityEventType.login_success,
        ip: clientIp,
        userAgent,
        metadata: {
          method: 'email',
          isNewDevice: security?.isNewDevice ?? false,
        },
      }),
    ]);

    return loginRes;
  }

  private async handleMfaLogin(
    user: Pick<
      User,
      'id' | 'mfaTotpEnabled' | 'totpSecret' | 'backupCodes' | 'backupCodesUsed'
    >,
    security?: SecurityCheckResult,
  ): Promise<ILoginResponse> {
    const loginToken = IdUtil.token16();
    const mfaToken = await this.deps.mfaUtilService.createSession({
      loginToken,
      user,
      security,
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'email' },
    });

    return {
      type: LoginResType.MFA_CONFIRM,
      mfaToken,
    } as typeof LoginMFAResDto.static;
  }

  private async handleMfaSetupRequired(
    user: { id: string },
    security?: SecurityCheckResult,
  ): Promise<ILoginResponse> {
    const { clientIp, userAgent } = getIpAndUa();

    const setupToken = IdUtil.token16();
    const createdAt = Date.now();

    const oldToken = await mfaSetupTokenByUserCache.get(user.id);
    if (oldToken) {
      await mfaSetupTokenCache.del(oldToken);
    }

    await mfaSetupTokenByUserCache.set(user.id, setupToken);
    await mfaSetupTokenCache.set(setupToken, {
      userId: user.id,
      clientIp,
      userAgent,
      createdAt,
      security,
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'email', action: 'mfa_setup_required' },
    });

    return {
      type: LoginResType.MFA_SETUP,
      setupToken,
    } as typeof LoginMFASetupResDto.static;
  }

  private validatePasswordAttempts(
    user: { passwordAttempt: number },
    enbAttempt: boolean,
  ): void {
    if (
      enbAttempt &&
      user.passwordAttempt >= this.deps.env.PASSWORD_MAX_ATTEMPT
    ) {
      throw new BadReqErr(ErrCode.PasswordMaxAttempt);
    }
  }

  private validatePasswordExpiration(
    user: { passwordExpired: Date | null },
    enbExpired: boolean,
  ): void {
    if (
      user.passwordExpired &&
      enbExpired &&
      new Date() > new Date(user.passwordExpired)
    ) {
      throw new BadReqErr(ErrCode.PasswordExpired);
    }
  }

  async register(params: RegisterParams): Promise<{ otpToken: string } | null> {
    const { email, password } = params;

    const { clientIp } = getIpAndUa();
    await this.checkRegisterRateLimit(email, clientIp);

    this.deps.passwordValidationService.validatePasswordOrThrow(password);

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    if (existingUser) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.REGISTER,
        payload: { method: 'email', error: 'User already exists' },
      });
      throw new BadReqErr(ErrCode.UserExisted);
    }

    const createdUserId = await this.deps.db.$transaction(async (tx) => {
      const userId = await this.createUserWithDefaults(
        tx,
        normalizedEmail,
        password,
      );

      return userId;
    });

    const otpToken = await this.deps.otpService.sendOtp(
      createdUserId,
      normalizedEmail,
      PurposeVerify.REGISTER,
    );

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.REGISTER,
      payload: { method: 'email' },
    });

    if (otpToken) {
      return { otpToken };
    }
    return null;
  }

  private async createUserWithDefaults(
    tx: PrismaTx,
    email: string,
    password: string,
  ): Promise<string> {
    const userId = IdUtil.dbId(DB_PREFIX.USER);

    await tx.user.create({
      data: {
        id: userId,
        email,
        status: UserStatus.inactive,
        ...(await this.deps.passwordService.createPassword(password)),
        roles: {
          create: {
            id: IdUtil.dbId(),
            roleId: defaultRoles.user.id,
          },
        },
        refCode: IdUtil.token8().toUpperCase(),
      },
      select: { id: true },
    });

    return userId;
  }

  async changePassword(params: ChangePasswordParams): Promise<void> {
    const { userId, oldPassword, newPassword } = params;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { password: true, status: true, email: true },
    });
    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    if (user.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    if (user.password) {
      if (!oldPassword) {
        throw new BadReqErr(ErrCode.PasswordNotMatch);
      }
      const match = await this.deps.passwordService.comparePassword(
        oldPassword,
        user.password,
      );
      if (!match) {
        throw new BadReqErr(ErrCode.PasswordNotMatch);
      }
    }

    const { clientIp, userAgent } = getIpAndUa();

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
      select: { id: true },
    });

    await Promise.all([
      this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.CHANGE_PASSWORD,
        payload: {},
      }),
      this.deps.securityEventService.create({
        userId,
        eventType: SecurityEventType.password_changed,
        ip: clientIp,
        userAgent,
      }),
    ]);
  }

  async forgotPassword(params: ForgotPasswordParams): Promise<void> {
    const { otpToken, otp, newPassword } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.FORGOT_PASSWORD,
      otp,
    );

    if (!userId) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.CHANGE_PASSWORD,
        payload: {},
      });
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    await this.deps.db.user.update({
      where: { id: user.id },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
    });

    const { clientIp, userAgent } = getIpAndUa();

    await this.deps.sessionService.revoke(userId);

    await Promise.all([
      this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.CHANGE_PASSWORD,
        payload: {},
      }),
      this.deps.securityEventService.create({
        userId: user.id,
        eventType: SecurityEventType.password_reset_completed,
        ip: clientIp,
        userAgent,
      }),
    ]);
  }

  async verifyAccount(params: VerifyAccountParams): Promise<void> {
    const { otpToken, otp } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.REGISTER,
        payload: { method: 'email', error: 'invalid_otp' },
      });
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId, status: UserStatus.inactive },
        data: { status: UserStatus.active },
        select: { id: true },
      });
      if (user.id) {
        await this.deps.referralService.activeReferral(tx, user.id);
      }
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.UPDATE_USER,
      payload: {
        id: userId,
        changes: {
          status: { previous: UserStatus.inactive, next: UserStatus.active },
        },
      },
    });
  }

  async refreshToken(params: RefreshTokenParams): Promise<ILoginRes> {
    const { token } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const session = await this.deps.db.session.findFirst({
      where: { token },
      select: {
        revoked: true,
        id: true,
        expired: true,
        createdBy: { select: userResSelect },
      },
    });

    if (
      !session ||
      session.revoked ||
      isExpired(session.expired) ||
      !session.createdBy ||
      session.createdBy.status !== 'active'
    ) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: 'email', error: 'refresh_token_invalid' },
        userId: session?.createdBy?.id ?? null,
      });
      throw new UnAuthErr(ErrCode.ExpiredToken);
    }

    const payload: ITokenPayload = {
      userId: session.createdBy.id,
      timestamp: Date.now(),
      sessionId: session.id,
      clientIp,
      userAgent,
    };

    const { accessToken, expirationTime } =
      await this.deps.tokenService.createAccessToken(payload);

    const user = {
      ...session.createdBy,
      permissions: await this.deps.userUtilService.getPermissions(
        session.createdBy,
      ),
    };

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'email', action: 'refresh_token' },
      userId: session.createdBy.id,
      sessionId: session.id,
    });

    return {
      type: LoginResType.COMPLETED,
      accessToken,
      refreshToken: token,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user,
    };
  }

  async logout(params: LogoutParams): Promise<void> {
    const { id, sessionId } = params;

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGOUT,
      payload: {},
    });

    await this.deps.sessionService.revoke(id, [sessionId]);
  }

  async logoutAll(params: LogoutParams): Promise<void> {
    const { id, sessionId } = params;

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.REVOKE_SESSION,
      payload: { sessionId },
    });

    await this.deps.sessionService.revoke(id);
  }

  async confirmMfaLogin(params: ConfirmMfaLoginParams): Promise<ILoginRes> {
    const { mfaToken, loginToken, otp } = params;

    const cachedData = await this.deps.mfaCache.get(mfaToken);
    if (!cachedData || cachedData.loginToken !== loginToken) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: 'email', error: 'mfa_session_expired' },
      });
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    return this.deps.mfaVerificationService.verifyAndCompleteLogin({
      mfaToken,
      otp,
    });
  }

  loginWithMfa(params: LoginWithMfaParams): Promise<ILoginRes> {
    return this.deps.mfaVerificationService.verifyAndCompleteLogin(params);
  }

  async getProfile(userId: string) {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: userResSelect,
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    const permissions = await this.deps.userUtilService.getPermissions(user);

    return {
      ...user,
      permissions,
    };
  }

  async logRegisterRateLimitViolation(email: string): Promise<void> {
    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.REGISTER,
      payload: { method: 'email', error: 'rate_limit_exceeded' },
    });
  }
}

export const authService = new AuthService();
