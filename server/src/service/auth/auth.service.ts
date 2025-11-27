import dayjs from 'dayjs';
import { authenticator } from 'otplib';
import {
  type ILoginRateLimitCache,
  type IMFACache,
  loginRateLimitCache,
  mfaCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { UserStatus } from 'src/generated';
import type {
  ChangePasswordRequestDto,
  ForgotPasswordRequestDto,
  ILoginRes,
  ILoginResponse,
  LoginMFAResDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  VerifyAccountRequestDto,
} from 'src/modules/auth/dtos';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  type ReferralService,
  referralService,
} from 'src/service/misc/referral.service';
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

type LoginParams = typeof LoginRequestDto.static & {
  clientIp: string;
  userAgent: string;
};

type RegisterParams = typeof RegisterRequestDto.static & {
  clientIp?: string;
  userAgent?: string;
};

type ChangePasswordParams = {
  userId: string;
} & typeof ChangePasswordRequestDto.static;

type ForgotPasswordParams = typeof ForgotPasswordRequestDto.static;

type VerifyAccountParams = typeof VerifyAccountRequestDto.static & {
  clientIp: string;
  userAgent: string;
};

type RefreshTokenParams = typeof RefreshTokenRequestDto.static & {
  clientIp: string;
  userAgent: string;
};

type LogoutParams = {
  userId: string;
  sessionId: string;
  clientIp: string;
  userAgent: string;
};

type ConfirmMfaLoginParams = {
  mfaToken: string;
  loginToken: string;
  otp: string;
  clientIp: string;
  userAgent: string;
};

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
      referralService: ReferralService;
      userUtilService: UserUtilService;
      loginRateLimitCache: ILoginRateLimitCache;
      mfaCache: IMFACache;
      authenticator: typeof authenticator;
      securityMonitorService: SecurityMonitorService;
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
      referralService,
      userUtilService,
      loginRateLimitCache,
      mfaCache,
      authenticator,
      securityMonitorService,
    },
  ) {}

  async login(params: LoginParams): Promise<ILoginResponse> {
    const { email, password, clientIp, userAgent } = params;

    this.validateLoginInput(email, password);

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
      await this.logFailedLoginAttempt(clientIp, userAgent, {
        reason: 'password_mismatch',
        userId: user.id,
      });
      throw new BadReqErr(ErrCode.PasswordNotMatch);
    }

    if (user.status !== UserStatus.active) {
      await this.logFailedLoginAttempt(clientIp, userAgent, {
        reason: 'user_not_active',
        userId: user.id,
      });
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    this.validatePasswordExpiration(user, enbExpired);

    const securityResult = await this.deps.securityMonitorService.evaluateLogin(
      {
        userId: user.id,
        clientIp,
        userAgent,
        method: 'email',
      },
    );

    if (securityResult.action === 'block') {
      await this.logFailedLoginAttempt(clientIp, userAgent, {
        reason: 'security_blocked',
        userId: user.id,
      });
      throw new BadReqErr(ErrCode.SuspiciousLoginBlocked);
    }

    if (user.mfaTotpEnabled) {
      return this.handleMfaLogin(user, clientIp, userAgent, securityResult);
    }

    return this.handleSuccessfulLogin(
      user,
      clientIp,
      userAgent,
      securityResult,
    );
  }

  private validateLoginInput(email: string, password: string): void {
    if (!email || !email.trim()) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Email is required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid email format',
      });
    }

    if (!password || !password.trim()) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Password is required',
      });
    }
  }

  private async checkRateLimit(email: string, clientIp: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const rateLimitKey = `login:${clientIp}:${normalizedEmail}`;
    const currentAttempts =
      (await this.deps.loginRateLimitCache.get(rateLimitKey)) ?? 0;

    const { max, windowSeconds } =
      await this.deps.settingService.loginRateLimit();

    if (currentAttempts >= max) {
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

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'email' },
      userId: user.id,
      ip: clientIp,
      userAgent,
    });

    return loginRes;
  }

  private async logFailedLoginAttempt(
    clientIp: string,
    userAgent: string,
    metadata: { reason: string; userId?: string },
  ): Promise<void> {
    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: {
        method: 'email',
        error: metadata.reason,
      },
      userId: metadata.userId ?? null,
      ip: clientIp,
      userAgent,
    });
  }

  private async handleMfaLogin(
    user: {
      id: string;
      mfaTotpEnabled: boolean;
      totpSecret: string | null;
    },
    clientIp: string,
    userAgent: string,
    security?: SecurityCheckResult,
  ): Promise<ILoginResponse> {
    const loginToken = IdUtil.token16();
    const mfaToken = await this.deps.mfaUtilService.createSession({
      loginToken,
      user: {
        id: user.id,
        mfaTotpEnabled: user.mfaTotpEnabled,
        totpSecret: user.totpSecret,
      },
      security,
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'email' },
      userId: user.id,
      ip: clientIp,
      userAgent,
    });

    return {
      type: LoginResType.MFA_CONFIRM,
      loginToken,
      mfaToken,
    } as typeof LoginMFAResDto.static;
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
    const { email, password, clientIp, userAgent } = params;

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
        userId: null,
        ip: clientIp,
        userAgent,
      });
      throw new BadReqErr(ErrCode.UserExisted);
    }

    const createdUserId = await this.deps.db.$transaction(async (tx) => {
      const defaultCurrency = await this.findDefaultCurrency(tx);
      if (!defaultCurrency) {
        throw new BadReqErr(ErrCode.InternalError);
      }

      const userId = await this.createUserWithDefaults(
        tx,
        normalizedEmail,
        password,
        defaultCurrency.id,
      );

      await this.deps.userUtilService.createProfile(tx, userId);

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
      userId: createdUserId,
      ip: clientIp,
      userAgent,
    });

    if (otpToken) {
      return { otpToken };
    }
    return null;
  }

  private findDefaultCurrency(tx: PrismaTx): Promise<{ id: string } | null> {
    return tx.currency.findFirst({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true },
    });
  }

  private async createUserWithDefaults(
    tx: PrismaTx,
    email: string,
    password: string,
    baseCurrencyId: string,
  ): Promise<string> {
    const userId = IdUtil.dbId(DB_PREFIX.USER);

    await tx.user.create({
      data: {
        id: userId,
        email,
        status: UserStatus.inactive,
        baseCurrencyId,
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

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
      select: { id: true },
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.CHANGE_PASSWORD,
      payload: {},
      userId,
    });
  }

  async forgotPassword(params: ForgotPasswordParams): Promise<void> {
    const { otpToken, otp, newPassword } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
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

    await this.deps.sessionService.revoke(userId);

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.CHANGE_PASSWORD,
      payload: {},
      userId,
    });
  }

  async verifyAccount(params: VerifyAccountParams): Promise<void> {
    const { otpToken, otp, clientIp, userAgent } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
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
      userId,
      ip: clientIp,
      userAgent,
    });
  }

  async refreshToken(params: RefreshTokenParams): Promise<ILoginRes> {
    const { token, clientIp, userAgent } = params;

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
    const { userId, sessionId, clientIp, userAgent } = params;

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGOUT,
      payload: {},
      userId,
      sessionId,
      ip: clientIp,
      userAgent,
    });

    await this.deps.sessionService.revoke(userId, [sessionId]);
  }

  async logoutAll(params: LogoutParams): Promise<void> {
    const { userId, sessionId, clientIp, userAgent } = params;

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.REVOKE_SESSION,
      payload: { sessionId },
      userId,
      sessionId,
      ip: clientIp,
      userAgent,
    });

    await this.deps.sessionService.revoke(userId);
  }

  async confirmMfaLogin(params: ConfirmMfaLoginParams): Promise<ILoginRes> {
    const { mfaToken, loginToken, otp, clientIp, userAgent } = params;

    if (!mfaToken || !loginToken || !otp) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'mfaToken, loginToken, and otp are required',
      });
    }

    const cacheKey = this.deps.mfaUtilService.getKey(mfaToken, loginToken);
    const cachedData = await this.deps.mfaCache.get(cacheKey);

    if (!cachedData) {
      await this.logFailedLoginAttempt(clientIp, userAgent, {
        reason: 'mfa_session_expired',
      });
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: cachedData.userId },
      include: { roles: true },
    });

    if (!user || !user.totpSecret) {
      await this.logFailedLoginAttempt(clientIp, userAgent, {
        reason: 'mfa_user_not_found',
        userId: cachedData.userId,
      });
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    const isValidOtp = this.deps.authenticator.verify({
      secret: user.totpSecret,
      token: otp,
    });

    if (!isValidOtp) {
      await this.logFailedLoginAttempt(clientIp, userAgent, {
        reason: 'mfa_invalid_otp',
        userId: user.id,
      });
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    if (user.status !== UserStatus.active) {
      await this.logFailedLoginAttempt(clientIp, userAgent, {
        reason: 'user_not_active',
        userId: user.id,
      });
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    await this.deps.mfaCache.del(cacheKey);

    let securityContext = cachedData.security;

    if (!securityContext) {
      const securityResult =
        await this.deps.securityMonitorService.evaluateLogin({
          userId: user.id,
          clientIp,
          userAgent,
          method: 'email',
        });

      if (securityResult.action === 'block') {
        await this.logFailedLoginAttempt(clientIp, userAgent, {
          reason: 'security_blocked',
          userId: user.id,
        });
        throw new BadReqErr(ErrCode.SuspiciousLoginBlocked);
      }

      securityContext = securityResult;
    }

    const loginRes = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
      securityContext,
    );

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'email' },
      userId: user.id,
      ip: clientIp,
      userAgent,
    });

    return loginRes;
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
}

export const authService = new AuthService();
