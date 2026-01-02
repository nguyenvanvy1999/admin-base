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
import { AuditLogVisibility, UserStatus } from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import {
  buildDeleteChanges,
  buildUpdateChanges,
} from 'src/services/audit-logs/audit-logs.utils';
import {
  type OtpService,
  otpService,
} from 'src/services/auth/methods/otp.service';
import {
  type PasswordService,
  passwordService,
} from 'src/services/auth/methods/password.service';
import {
  type SecurityMonitorService,
  securityMonitorService,
} from 'src/services/auth/security/security-monitor.service';
import {
  type SessionService,
  sessionService,
} from 'src/services/auth/session.service';
import { AuthMethod, AuthStatus } from 'src/services/auth/types/constants';
import {
  assertUserActiveOrBadReq,
  assertUserExists,
} from 'src/services/auth/utils/auth-errors.util';
import {
  type TokenService,
  tokenService,
  type UserUtilService,
  userUtilService,
} from 'src/services/auth/utils/auth-util.service';
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
import {
  buildAuditLogPushOptions,
  buildLogoutAuditLog,
  buildOtpInvalidAuditLog,
  buildPasswordChangedAuditLog,
  buildPasswordResetCompletedAuditLog,
  buildPasswordResetFailedAuditLog,
  buildRefreshTokenFailedAuditLog,
  buildRefreshTokenSuccessAuditLog,
  buildRegisterFailedAuditLog,
  buildRegisterStartedAuditLog,
} from '../utils/auth-audit.helper';
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
        buildRegisterFailedAuditLog(
          normalizedEmail,
          AuthMethod.EMAIL,
          'user_exists',
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
      buildRegisterStartedAuditLog(
        { id: createdUserId, email: normalizedEmail },
        AuthMethod.EMAIL,
        { userId: createdUserId },
      ),
      buildAuditLogPushOptions(createdUserId),
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
      buildPasswordChangedAuditLog(user, 'user', {
        userId,
        sessionId,
      }),
      buildAuditLogPushOptions(userId, { sessionId }),
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
        buildPasswordResetFailedAuditLog(undefined, 'invalid_otp'),
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
      buildPasswordResetCompletedAuditLog(
        { id: user.id, email: null },
        { userId: user.id },
      ),
      buildAuditLogPushOptions(user.id),
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
        buildOtpInvalidAuditLog(
          undefined,
          PurposeVerify.REGISTER,
          'invalid_otp',
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
        buildRefreshTokenFailedAuditLog(
          {
            id: session?.createdBy?.id ?? '',
            email: session?.createdBy?.email ?? null,
          },
          'refresh_token_invalid',
          {
            userId: session?.createdBy?.id,
            sessionId: session?.id,
          },
        ),
        buildAuditLogPushOptions(session?.createdBy?.id ?? '', {
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
      buildRefreshTokenSuccessAuditLog(
        {
          id: session.createdBy.id,
          email: session.createdBy.email,
        },
        {
          userId: session.createdBy.id,
          sessionId: session.id,
        },
      ),
      buildAuditLogPushOptions(session.createdBy.id, {
        sessionId: session.id,
      }),
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
      buildLogoutAuditLog({ id, email: null }, AuthMethod.EMAIL, {
        userId: id,
        sessionId,
      }),
      buildAuditLogPushOptions(id, { sessionId }),
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
