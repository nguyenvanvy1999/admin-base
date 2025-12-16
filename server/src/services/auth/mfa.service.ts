import crypto from 'node:crypto';
import { authenticator } from 'otplib';
import {
  type IMFACache,
  type IMfaAttemptCache,
  mfaAttemptCache,
  mfaCache,
  mfaSetupCache,
  mfaSetupTokenByUserCache,
  mfaSetupTokenCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type {
  ILoginRes,
  ResetMfaParams,
  SetupMfaParams,
  SetupMfaRequestParams,
  VerifyAndCompleteLoginParams,
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
  BadReqErr,
  ctxStore,
  ErrCode,
  getIpAndUa,
  type IBackupCodesData,
  type IBackupCodesRemaining,
  type IDisableMfaParams,
  IdUtil,
  type IGenerateBackupCodesParams,
  type IMfaStatus,
  type IUserMFA,
  isExpired,
  MFA_ERROR_PAYLOADS,
  NotFoundErr,
  PurposeVerify,
  type SecurityDeviceInsight,
  userResSelect,
} from 'src/share';
import {
  type UserUtilService as UserUtilServiceType,
  userUtilService,
} from './auth-util.service';
import { otpService } from './otp.service';
import {
  type SecurityMonitorService as SecurityMonitorServiceType,
  securityMonitorService,
} from './security-monitor.service';
import { sessionService } from './session.service';

export const BACKUP_CODES_COUNT = 10;
export const BACKUP_CODE_LENGTH = 8;

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function parseBackupCodes(data: string | null): string[] {
  return data ? (JSON.parse(data) as string[]) : [];
}

export function parseUsedBackupCodes(data: string | null): string[] {
  return data ? (JSON.parse(data) as string[]) : [];
}

export function generateBackupCodes(
  count = BACKUP_CODES_COUNT,
  length = BACKUP_CODE_LENGTH,
): string[] {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < length; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }

  return codes;
}

type TokenGenerator = () => string;

export class MfaService {
  private readonly MAX_MFA_ATTEMPTS = 5;
  private readonly MFA_ATTEMPT_TTL = 300;

  constructor(
    private readonly deps: {
      db: IDb;
      mfaCache: IMFACache;
      mfaAttemptCache: IMfaAttemptCache;
      mfaSetupCache: typeof mfaSetupCache;
      mfaSetupTokenCache: typeof mfaSetupTokenCache;
      mfaSetupTokenByUserCache: typeof mfaSetupTokenByUserCache;
      authenticator: typeof authenticator;
      userUtilService: UserUtilServiceType;
      securityMonitorService: SecurityMonitorServiceType;
      auditLogService: AuditLogsService;
      generateToken: TokenGenerator;
    } = {
      db,
      mfaCache,
      mfaAttemptCache,
      mfaSetupCache,
      mfaSetupTokenCache,
      mfaSetupTokenByUserCache,
      authenticator,
      userUtilService,
      securityMonitorService,
      auditLogService: auditLogsService,
      generateToken: IdUtil.token16,
    },
  ) {}

  setupMfaRequest(params: SetupMfaRequestParams) {
    const { setupToken } = params;

    const { userId, sessionId } = ctxStore.getStore() ?? {};
    if (userId) {
      return this.setupMfaRequestForAuthenticatedUser(userId, sessionId);
    }

    if (setupToken) {
      return this.setupMfaRequestForUnauthenticatedUser(setupToken);
    }

    throw new BadReqErr(ErrCode.ValidationError, {
      errors: 'Either userId or setupToken is required',
    });
  }

  private async setupMfaRequestForAuthenticatedUser(
    userId: string,
    sessionId: string | undefined,
  ) {
    if (sessionId) {
      await this.validateSessionActive(sessionId, userId);
    }

    await this.ensureMfaNotEnabled(userId);

    const mfaToken = this.deps.generateToken();
    const totpSecret = this.generateTotpSecret();

    await this.deps.mfaSetupCache.set(mfaToken, {
      totpSecret,
      userId,
      sessionId: sessionId || '',
      setupToken: undefined,
      createdAt: Date.now(),
    });

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_enabled,
        severity: SecurityEventSeverity.low,
        method: 'totp',
        metadata: { stage: 'request' },
      },
      { subjectUserId: userId },
    );

    return {
      mfaToken,
      totpSecret,
    };
  }

  private async setupMfaRequestForUnauthenticatedUser(setupToken: string) {
    const tokenData = await this.deps.mfaSetupTokenCache.get(setupToken);
    if (!tokenData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    await this.ensureMfaNotEnabled(tokenData.userId);

    const mfaToken = this.deps.generateToken();
    const totpSecret = this.generateTotpSecret();

    await this.deps.mfaSetupCache.set(mfaToken, {
      totpSecret,
      userId: tokenData.userId,
      sessionId: '',
      setupToken,
      createdAt: Date.now(),
    });

    await this.deps.mfaSetupTokenCache.del(setupToken);

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_enabled,
        severity: SecurityEventSeverity.low,
        method: 'totp',
        metadata: { stage: 'request' },
      },
      { subjectUserId: tokenData.userId },
    );

    return {
      mfaToken,
      totpSecret,
    };
  }

  async setupMfa(params: SetupMfaParams) {
    const { mfaToken, otp } = params;

    const cachedData = await this.deps.mfaSetupCache.get(mfaToken);
    if (!cachedData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    let securityContext: SecurityDeviceInsight | undefined;

    if (cachedData.setupToken) {
      const tokenData = await this.deps.mfaSetupTokenCache.get(
        cachedData.setupToken,
      );
      if (!tokenData) {
        throw new BadReqErr(ErrCode.SessionExpired);
      }
      securityContext = tokenData.security;
    }

    if (cachedData.sessionId) {
      await this.validateSessionActive(cachedData.sessionId, cachedData.userId);
    }

    const totpVerified = this.deps.authenticator.verify({
      secret: cachedData.totpSecret,
      token: otp,
    });

    if (!totpVerified) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.user.update({
      where: { id: cachedData.userId },
      data: {
        totpSecret: cachedData.totpSecret,
        mfaTotpEnabled: true,
      },
      select: { id: true },
    });

    const loginToken = IdUtil.token16();

    await this.deps.mfaCache.set(mfaToken, {
      userId: cachedData.userId,
      loginToken,
      createdAt: Date.now(),
      security: securityContext,
    });

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_enabled,
        severity: SecurityEventSeverity.low,
        method: 'totp',
      },
      { subjectUserId: cachedData.userId },
    );

    if (cachedData.sessionId) {
      await sessionService.revoke(cachedData.userId, [cachedData.sessionId]);
    }

    if (cachedData.setupToken) {
      await this.deps.mfaSetupTokenCache.del(cachedData.setupToken);
      await this.deps.mfaSetupTokenByUserCache.del(cachedData.userId);
    }

    await this.deps.mfaSetupCache.del(mfaToken);

    return {
      mfaToken,
      loginToken,
    };
  }

  async disableMfa(params: IDisableMfaParams) {
    const { userId, otp, backupCode } = params;

    const mfaUser = await this.findMfaUserById(userId);
    if (!mfaUser.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MFANotEnabled);
    }

    let isValid = false;

    if (otp && mfaUser.totpSecret) {
      isValid = this.deps.authenticator.verify({
        secret: mfaUser.totpSecret,
        token: otp,
      });
    } else if (backupCode && mfaUser.backupCodes) {
      isValid = this.validateBackupCode(mfaUser, backupCode);
    }

    if (!isValid) {
      if (otp) {
        throw new BadReqErr(ErrCode.InvalidOtp);
      } else {
        throw new BadReqErr(ErrCode.InvalidBackupCode);
      }
    }

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        mfaTotpEnabled: false,
        backupCodes: null,
        backupCodesUsed: null,
      },
      select: { id: true },
    });

    await sessionService.revoke(userId);

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_disabled,
        severity: SecurityEventSeverity.medium,
        method: otp ? 'totp' : 'email',
        disabledBy: 'user',
      },
      { subjectUserId: userId },
    );

    return null;
  }

  async resetMfa(params: ResetMfaParams) {
    const { otpToken, otp } = params;

    const userId = await otpService.verifyOtp(
      otpToken,
      PurposeVerify.RESET_MFA,
      otp,
    );

    if (!userId) {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.mfa_failed,
          severity: SecurityEventSeverity.medium,
          method: 'email',
          error: 'invalid_otp',
        },
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        mfaTotpEnabled: false,
        backupCodes: null,
        backupCodesUsed: null,
      },
      select: { id: true },
    });

    await sessionService.revoke(userId);
    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_disabled,
        severity: SecurityEventSeverity.medium,
        method: 'email',
        disabledBy: 'admin',
      },
      { subjectUserId: userId },
    );

    return null;
  }

  async getMfaStatus(userId: string): Promise<IMfaStatus> {
    const mfaUser = await this.findMfaUserById(userId);

    const hasBackupCodes = Boolean(mfaUser.backupCodes);
    let backupCodesRemaining = 0;

    if (hasBackupCodes && mfaUser.backupCodes) {
      const backupCodes = parseBackupCodes(mfaUser.backupCodes);
      const usedCodes = mfaUser.backupCodesUsed
        ? parseUsedBackupCodes(mfaUser.backupCodesUsed)
        : [];
      backupCodesRemaining = backupCodes.length - usedCodes.length;
    }

    return {
      enabled: mfaUser.mfaTotpEnabled,
      hasBackupCodes,
      backupCodesRemaining,
    };
  }

  async verifyAndCompleteLogin(
    params: VerifyAndCompleteLoginParams,
  ): Promise<ILoginRes> {
    const { mfaToken } = params;
    const { clientIp, userAgent } = getIpAndUa();
    const otp = 'otp' in params ? params.otp : undefined;
    const backupCode = 'backupCode' in params ? params.backupCode : undefined;
    if (!otp && !backupCode) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Either otp or backupCode is required',
      });
    }

    const cachedData = await this.deps.mfaCache.get(mfaToken);
    if (!cachedData) {
      await this.logMfaError('SESSION_EXPIRED');
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    const attemptKey = `mfa:${mfaToken}`;
    const attempts = (await this.deps.mfaAttemptCache.get(attemptKey)) ?? 0;

    if (attempts >= this.MAX_MFA_ATTEMPTS) {
      await this.logMfaError('TOO_MANY_ATTEMPTS');
      throw new BadReqErr(ErrCode.TooManyAttempts);
    }

    await this.deps.mfaAttemptCache.set(
      attemptKey,
      attempts + 1,
      this.MFA_ATTEMPT_TTL,
    );

    const user = await this.deps.db.user.findUnique({
      where: { id: cachedData.userId },
      select: {
        ...userResSelect,
        mfaTotpEnabled: true,
        totpSecret: true,
        backupCodes: true,
        backupCodesUsed: true,
      },
    });

    if (!user) {
      await this.logMfaError('USER_NOT_FOUND', cachedData.userId);
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    if (user.status !== UserStatus.active) {
      await this.logMfaError('USER_NOT_ACTIVE', user.id);
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    let isValid = false;

    if (otp) {
      if (!user.totpSecret) {
        await this.logMfaError('USER_NOT_FOUND', user.id);
        throw new NotFoundErr(ErrCode.UserNotFound);
      }

      isValid = this.deps.authenticator.verify({
        secret: user.totpSecret,
        token: otp,
      });

      if (!isValid) {
        await this.deps.auditLogService.pushSecurity(
          {
            category: 'security',
            eventType: SecurityEventType.mfa_failed,
            severity: SecurityEventSeverity.medium,
            method: 'totp',
            error: 'invalid_otp',
          },
          { subjectUserId: user.id },
        );
        throw new BadReqErr(ErrCode.InvalidOtp);
      }
    } else if (backupCode) {
      isValid = await this.checkAndUseBackupCode(user, backupCode);
      if (!isValid) {
        await this.logMfaError('INVALID_BACKUP_CODE', user.id);
        throw new BadReqErr(ErrCode.InvalidBackupCode);
      }
    }

    let securityContext = cachedData.security;

    if (!securityContext) {
      const securityResult =
        await this.deps.securityMonitorService.evaluateLogin({
          userId: user.id,
          method: 'email',
        });

      if (securityResult.action === 'block') {
        await this.logMfaError('SECURITY_BLOCKED', user.id);
        throw new BadReqErr(ErrCode.SuspiciousLoginBlocked);
      }

      securityContext = securityResult;
    }

    await this.deps.mfaCache.del(mfaToken);
    await this.deps.mfaAttemptCache.del(attemptKey);

    const loginRes = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
      securityContext,
    );

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_verified,
        severity: SecurityEventSeverity.low,
        method: otp ? 'totp' : 'email',
      },
      { subjectUserId: user.id },
    );

    return loginRes;
  }

  async generateBackupCodes(
    params: IGenerateBackupCodesParams,
  ): Promise<IBackupCodesData> {
    const { otp } = params;
    const { userId } = ctxStore.getStore() ?? {};
    if (!userId) {
      throw new BadReqErr(ErrCode.InvalidToken, {
        errors: 'User ID not available',
      });
    }

    const mfaUser = await this.findMfaUserById(userId);
    if (!mfaUser.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MFANotEnabled);
    }

    if (!mfaUser.totpSecret) {
      throw new BadReqErr(ErrCode.MfaBroken);
    }

    const totpVerified = this.deps.authenticator.verify({
      secret: mfaUser.totpSecret,
      token: otp,
    });

    if (!totpVerified) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const codes = generateBackupCodes();
    const hashedCodes = codes.map((code) => hashBackupCode(code));

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        backupCodes: JSON.stringify(hashedCodes),
        backupCodesUsed: JSON.stringify([]),
      },
      select: { id: true },
    });

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_enabled,
        severity: SecurityEventSeverity.low,
        method: 'email',
      },
      { subjectUserId: userId },
    );

    return {
      codes,
      hashedCodes,
    };
  }

  verifyBackupCode(params: VerifyAndCompleteLoginParams): Promise<ILoginRes> {
    return this.verifyAndCompleteLogin(params);
  }

  async getBackupCodesRemaining(
    userId: string,
  ): Promise<IBackupCodesRemaining> {
    const mfaUser = await this.findMfaUserById(userId);

    if (!mfaUser.mfaTotpEnabled || !mfaUser.backupCodes) {
      return { remaining: 0, total: 0 };
    }

    const backupCodes = parseBackupCodes(mfaUser.backupCodes);
    const usedCodes = parseUsedBackupCodes(mfaUser.backupCodesUsed);

    return {
      remaining: backupCodes.length - usedCodes.length,
      total: backupCodes.length,
    };
  }

  async createSession({
    loginToken,
    user,
    security,
  }: {
    loginToken: string;
    user: IUserMFA;
    security?: SecurityDeviceInsight;
  }): Promise<string> {
    const mfaToken = this.deps.generateToken();
    if (user.mfaTotpEnabled && user.totpSecret) {
      await this.deps.mfaCache.set(mfaToken, {
        userId: user.id,
        security,
        loginToken,
        createdAt: Date.now(),
      });
      return mfaToken;
    }
    throw new BadReqErr(ErrCode.MfaBroken);
  }

  private async checkAndUseBackupCode(
    user: {
      id: string;
      mfaTotpEnabled: boolean;
      backupCodes: string | null;
      backupCodesUsed: string | null;
    },
    backupCode: string,
  ): Promise<boolean> {
    if (!backupCode || backupCode.length !== 8) {
      return false;
    }

    if (!user.mfaTotpEnabled || !user.backupCodes) {
      return false;
    }

    const backupCodes = parseBackupCodes(user.backupCodes);
    const usedCodes = parseUsedBackupCodes(user.backupCodesUsed);
    const hashedCode = hashBackupCode(backupCode);

    if (usedCodes.includes(hashedCode)) {
      throw new BadReqErr(ErrCode.BackupCodeAlreadyUsed);
    }

    if (!backupCodes.includes(hashedCode)) {
      return false;
    }

    usedCodes.push(hashedCode);

    await this.deps.db.user.update({
      where: { id: user.id },
      data: {
        backupCodesUsed: JSON.stringify(usedCodes),
      },
      select: { id: true },
    });

    return true;
  }

  private validateBackupCode(user: IUserMFA, backupCode: string): boolean {
    if (!user.backupCodes) {
      return false;
    }

    const backupCodes = parseBackupCodes(user.backupCodes);
    const usedCodes = user.backupCodesUsed
      ? parseUsedBackupCodes(user.backupCodesUsed)
      : [];
    const hashedCode = hashBackupCode(backupCode);

    if (usedCodes.includes(hashedCode)) {
      throw new BadReqErr(ErrCode.BackupCodeAlreadyUsed);
    }

    return backupCodes.includes(hashedCode);
  }

  private async logMfaError(
    errorType: keyof typeof MFA_ERROR_PAYLOADS,
    userId?: string,
  ): Promise<void> {
    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.login_failed,
        severity: SecurityEventSeverity.medium,
        method: 'email',
        error: MFA_ERROR_PAYLOADS[errorType]?.error ?? errorType,
      },
      { subjectUserId: userId },
    );
  }

  private async findMfaUserById(userId: string): Promise<IUserMFA> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaTotpEnabled: true,
        totpSecret: true,
        backupCodes: true,
        backupCodesUsed: true,
      },
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    return user;
  }

  private async ensureMfaNotEnabled(userId: string) {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaTotpEnabled: true },
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    if (user.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MFAHasBeenSetup);
    }
  }

  private generateTotpSecret(): string {
    return this.deps.authenticator.generateSecret().toUpperCase();
  }

  private async validateSessionActive(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const session = await this.deps.db.session.findUnique({
      where: { id: sessionId },
      select: { revoked: true, expired: true, createdById: true },
    });

    if (!session || session.revoked || isExpired(session.expired)) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    if (session.createdById !== userId) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Session does not belong to user',
      });
    }
  }
}

export const mfaService = new MfaService();
