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
import { SecurityEventSeverity, SecurityEventType } from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import {
  BadReqErr,
  ctxStore,
  ErrCode,
  type IBackupCodesData,
  type IBackupCodesRemaining,
  IdUtil,
  type IGenerateBackupCodesParams,
  type IMfaStatus,
  type IUserMFA,
  NotFoundErr,
  type SecurityDeviceInsight,
} from 'src/share';
import {
  type UserUtilService as UserUtilServiceType,
  userUtilService,
} from './auth-util.service';
import {
  type SecurityMonitorService as SecurityMonitorServiceType,
  securityMonitorService,
} from './security-monitor.service';

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

    const { sessionId } = ctxStore.getStore() ?? {};
    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_enabled,
        severity: SecurityEventSeverity.low,
        method: 'email',
      },
      {
        subjectUserId: userId,
        userId,
        sessionId,
      },
    );

    return {
      codes,
      hashedCodes,
    };
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
}

export const mfaService = new MfaService();
