import dayjs from 'dayjs';
import { authenticator } from 'otplib';
import {
  type IMFACache,
  mfaCache,
  mfaSetupTokenByUserCache,
  mfaSetupTokenCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type {
  ChangePasswordParams,
  ConfirmMfaLoginParams,
  ForgotPasswordParams,
  ILoginRes,
  ILoginResponse,
  LoginParams,
  LoginWithMfaParams,
  LogoutParams,
  RefreshTokenParams,
  RegisterParams,
  VerifyAccountParams,
} from 'src/dtos/auth.dto';
import { SecurityEventType, type User, UserStatus } from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import {
  type SettingsService,
  settingsService,
} from 'src/services/settings/settings.service';
import {
  ACTIVITY_TYPE,
  AuditEventCategory,
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
import { type MfaService, mfaService } from './mfa.service';
import { type OtpService, otpService } from './otp.service';
import {
  type PasswordService,
  type PasswordValidationService,
  passwordService,
  passwordValidationService,
} from './password.service';
import {
  type SecurityCheckResult,
  type SecurityMonitorService,
  securityMonitorService,
} from './security-monitor.service';
import { type SessionService, sessionService } from './session.service';

export class AuthService {
  constructor(
    private readonly deps: {
      db: IDb;
      env: IEnv;
      passwordService: PasswordService;
      passwordValidationService: PasswordValidationService;
      tokenService: TokenService;
      mfaService: MfaService;
      otpService: OtpService;
      sessionService: SessionService;
      settingService: SettingsService;
      auditLogService: AuditLogsService;
      userUtilService: UserUtilService;
      mfaCache: IMFACache;
      authenticator: typeof authenticator;
      securityMonitorService: SecurityMonitorService;
    } = {
      db,
      env,
      passwordService,
      passwordValidationService,
      tokenService,
      mfaService,
      otpService,
      sessionService,
      settingService: settingsService,
      auditLogService: auditLogsService,
      userUtilService,
      mfaCache,
      authenticator,
      securityMonitorService,
    },
  ) {}

  async login(params: LoginParams): Promise<ILoginResponse> {
    const { email, password } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const user = await this.findAndValidateUser(email);

    const { enbAttempt, enbExpired } =
      await this.deps.settingService.password();

    this.validatePasswordAttempts(user, enbAttempt);

    const passwordValid = await this.validatePasswordAndAttempts(
      password,
      user,
    );
    if (!passwordValid) {
      await this.deps.auditLogService.logSecurityEvent({
        userId: user.id,
        eventType: SecurityEventType.login_failed,
        metadata: { method: 'email', reason: 'password_mismatch' },
      });
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
      await this.deps.auditLogService.logSecurityEvent({
        userId: user.id,
        eventType: SecurityEventType.login_failed,
        metadata: { method: 'email', reason: 'security_blocked' },
      });
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

  private async findAndValidateUser(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        status: true,
        passwordAttempt: true,
        passwordExpired: true,
        mfaTotpEnabled: true,
        totpSecret: true,
        backupCodes: true,
        backupCodesUsed: true,
        created: true,
        modified: true,
        roles: { select: { roleId: true } },
      },
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

    await this.deps.auditLogService.logSecurityEvent({
      userId: user.id,
      eventType: SecurityEventType.login_success,
      metadata: {
        method: 'email',
        isNewDevice: security?.isNewDevice ?? false,
      },
    });

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
    const mfaToken = await this.deps.mfaService.createSession({
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
    } as ILoginResponse;
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
    } as ILoginResponse;
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

    const createdUserId = await this.deps.db.$transaction((tx) => {
      return this.createUserWithDefaults(tx, normalizedEmail, password);
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

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
      select: { id: true },
    });

    await this.deps.auditLogService.logSecurityEvent({
      userId,
      eventType: SecurityEventType.password_changed,
    });
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
      select: { id: true },
    });

    await this.deps.sessionService.revoke(userId);

    await this.deps.auditLogService.logSecurityEvent({
      userId: user.id,
      eventType: SecurityEventType.password_reset_completed,
    });
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
      await tx.user.update({
        where: { id: userId, status: UserStatus.inactive },
        data: { status: UserStatus.active },
        select: { id: true },
      });
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.UPDATE_USER,
      payload: {
        category: AuditEventCategory.CUD,
        entityType: 'user',
        entityId: userId,
        action: 'update',
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
      payload: {
        category: AuditEventCategory.CUD,
        entityType: 'session',
        entityId: sessionId,
        action: 'delete',
        changes: { sessionId: { previous: sessionId, next: null } },
      },
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

    return this.deps.mfaService.verifyAndCompleteLogin({
      mfaToken,
      otp,
    });
  }

  loginWithMfa(params: LoginWithMfaParams): Promise<ILoginRes> {
    return this.deps.mfaService.verifyAndCompleteLogin(params);
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
