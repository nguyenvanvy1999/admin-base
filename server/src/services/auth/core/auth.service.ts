import dayjs from 'dayjs';

import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type {
  ChangePasswordParams,
  ForgotPasswordParams,
  ILoginRes,
  LogoutParams,
  RefreshTokenParams,
  RegisterParams,
  VerifyAccountParams,
} from 'src/dtos/auth.dto';
import {
  AuditLogVisibility,
  SecurityEventSeverity,
  SecurityEventType,
  UserStatus,
} from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import {
  buildDeleteChanges,
  buildUpdateChanges,
} from 'src/services/audit-logs/utils';
import {
  type SettingsService,
  settingsService,
} from 'src/services/settings/settings.service';
import {
  BadReqErr,
  ctxStore,
  ErrCode,
  getIpAndUa,
  type ITokenPayload,
  isExpired,
  normalizeEmail,
  PurposeVerify,
  UnAuthErr,
} from 'src/share';
import { type OtpService, otpService } from '../methods/otp.service';
import {
  type PasswordService,
  passwordService,
} from '../methods/password.service';
import {
  type SecurityMonitorService,
  securityMonitorService,
} from '../security/security-monitor.service';
import { type SessionService, sessionService } from '../session.service';
import { AuthMethod, AuthStatus } from '../types/constants';
import {
  createAuditContext,
  createSecurityAuditLog,
} from '../utils/auth-audit.util';
import {
  assertUserActiveOrBadReq,
  assertUserExists,
} from '../utils/auth-errors.util';
import {
  type TokenService,
  tokenService,
  type UserUtilService,
  userUtilService,
} from '../utils/auth-util.service';
import { type AuthUserService, authUserService } from './auth-user.service';

export class AuthService {
  constructor(
    private readonly deps: {
      db: IDb;
      env: IEnv;
      passwordService: PasswordService;
      tokenService: TokenService;
      otpService: OtpService;
      sessionService: SessionService;
      settingService: SettingsService;
      auditLogService: AuditLogsService;
      userUtilService: UserUtilService;
      authUserService: AuthUserService;
      securityMonitorService: SecurityMonitorService;
    } = {
      db,
      env,
      passwordService,
      tokenService,
      otpService,
      sessionService,
      settingService: settingsService,
      auditLogService: auditLogsService,
      userUtilService,
      authUserService,
      securityMonitorService,
    },
  ) {}

  async register(params: RegisterParams): Promise<{ otpToken: string } | null> {
    const { email, password } = params;

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    if (existingUser) {
      await this.deps.auditLogService.pushSecurity(
        createSecurityAuditLog(
          SecurityEventType.register_failed,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          { id: '', email: normalizedEmail },
          { error: 'user_exists' },
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new BadReqErr(ErrCode.UserExisted);
    }

    const createdUserId = await this.deps.userUtilService.createUser(
      normalizedEmail,
      password,
    );

    const otpToken = await this.deps.otpService.sendOtp(
      createdUserId,
      normalizedEmail,
      PurposeVerify.REGISTER,
    );

    await this.deps.auditLogService.pushSecurity(
      createSecurityAuditLog(
        SecurityEventType.register_started,
        SecurityEventSeverity.low,
        AuthMethod.EMAIL,
        { id: createdUserId, email: normalizedEmail },
      ),
      createAuditContext(createdUserId),
    );

    if (otpToken) {
      return { otpToken };
    }
    return null;
  }

  async changePassword(params: ChangePasswordParams): Promise<void> {
    const { userId, oldPassword, newPassword } = params;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, status: true, email: true },
    });
    assertUserExists(user);
    assertUserActiveOrBadReq(user);

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

    if (await this.deps.settingService.revokeSessionsOnPasswordChange()) {
      await this.deps.sessionService.revoke(userId);
    }

    const { sessionId } = ctxStore.getStore() ?? {};
    await this.deps.auditLogService.pushSecurity(
      createSecurityAuditLog(
        SecurityEventType.password_changed,
        SecurityEventSeverity.medium,
        AuthMethod.EMAIL,
        { id: userId, email: user.email },
        { changedBy: 'user' },
      ),
      createAuditContext(userId, { sessionId }),
    );
  }

  async forgotPassword(params: ForgotPasswordParams): Promise<void> {
    const { otpToken, otp, newPassword } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.FORGOT_PASSWORD,
      otp,
    );

    if (!userId) {
      await this.deps.auditLogService.pushSecurity(
        createSecurityAuditLog(
          SecurityEventType.password_reset_failed,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          { id: '', email: '' },
          { error: 'invalid_otp' },
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    assertUserExists(user);

    await this.deps.db.user.update({
      where: { id: user.id },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
      select: { id: true },
    });

    await this.deps.sessionService.revoke(userId);

    await this.deps.auditLogService.pushSecurity(
      createSecurityAuditLog(
        SecurityEventType.password_reset_completed,
        SecurityEventSeverity.medium,
        AuthMethod.EMAIL,
        { id: user.id, email: '' },
      ),
      createAuditContext(user.id),
    );
  }

  async verifyAccount(params: VerifyAccountParams): Promise<void> {
    const { otpToken, otp } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
      await this.deps.auditLogService.pushSecurity(
        createSecurityAuditLog(
          SecurityEventType.otp_invalid,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          { id: '', email: '' },
          { purpose: PurposeVerify.REGISTER, error: 'invalid_otp' },
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId, status: UserStatus.inactive },
        data: { status: UserStatus.active },
        select: { id: true },
      });
    });

    const changes = buildUpdateChanges(
      { status: UserStatus.inactive },
      { status: UserStatus.active },
    );
    await this.deps.auditLogService.pushCud(
      {
        category: 'cud',
        entityType: 'user',
        entityId: userId,
        action: 'update',
        changes,
      },
      {
        subjectUserId: userId,
        visibility: AuditLogVisibility.actor_and_subject,
      },
    );
  }

  async refreshToken(params: RefreshTokenParams): Promise<ILoginRes> {
    const { token } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const session = await this.deps.sessionService.findByToken(token);

    if (
      !session ||
      session.revoked ||
      isExpired(session.expired) ||
      !session.createdBy ||
      session.createdBy.status !== UserStatus.active
    ) {
      await this.deps.auditLogService.pushSecurity(
        createSecurityAuditLog(
          SecurityEventType.refresh_token_failed,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          {
            id: session?.createdBy?.id ?? '',
            email: session?.createdBy?.email ?? '',
          },
          { error: 'refresh_token_invalid' },
        ),
        createAuditContext(session?.createdBy?.id ?? '', {
          sessionId: session?.id,
        }),
      );
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

    const userWithPermissions =
      await this.deps.authUserService.loadUserWithPermissions(
        session.createdBy.id,
        { checkStatus: false },
      );

    const user = {
      ...userWithPermissions,
      sessionId: session.id,
    };

    await this.deps.auditLogService.pushSecurity(
      createSecurityAuditLog(
        SecurityEventType.refresh_token_success,
        SecurityEventSeverity.low,
        AuthMethod.EMAIL,
        { id: session.createdBy.id, email: session.createdBy.email },
      ),
      createAuditContext(session.createdBy.id, { sessionId: session.id }),
    );

    return {
      type: AuthStatus.COMPLETED,
      accessToken,
      refreshToken: token,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user,
      sessionId: session.id,
    };
  }

  async logout(params: LogoutParams): Promise<void> {
    const { id, sessionId } = params;

    await this.deps.auditLogService.pushSecurity(
      createSecurityAuditLog(
        SecurityEventType.logout,
        SecurityEventSeverity.low,
        AuthMethod.EMAIL,
        { id, email: '' },
      ),
      createAuditContext(id, { sessionId }),
    );

    await this.deps.sessionService.revoke(id, [sessionId]);
  }

  async logoutAll(params: LogoutParams): Promise<void> {
    const { id, sessionId } = params;

    const changes = buildDeleteChanges({ sessionId });
    await this.deps.auditLogService.pushCud({
      category: 'cud',
      entityType: 'session',
      entityId: sessionId,
      action: 'delete',
      changes,
    });

    await this.deps.sessionService.revoke(id);
  }
}

export const authService = new AuthService();
