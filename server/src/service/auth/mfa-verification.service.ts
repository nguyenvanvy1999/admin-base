import { authenticator } from 'otplib';
import {
  type IMFACache,
  type IMfaAttemptCache,
  mfaAttemptCache,
  mfaCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { UserStatus } from 'src/generated';
import type { ILoginRes } from 'src/modules/auth/dtos';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  ErrCode,
  getIpAndUa,
  MFA_ERROR_PAYLOADS,
  NotFoundErr,
  userResSelect,
} from 'src/share';
import {
  type UserUtilService as UserUtilServiceType,
  userUtilService,
} from './auth-util.service';
import {
  type SecurityMonitorService as SecurityMonitorServiceType,
  securityMonitorService,
} from './security-monitor.service';

type VerifyAndCompleteLoginParams = {
  mfaToken: string;
  otp?: string;
  backupCode?: string;
};

export class MfaVerificationService {
  private readonly MAX_MFA_ATTEMPTS = 5;
  private readonly MFA_ATTEMPT_TTL = 300;

  constructor(
    private readonly deps: {
      db: IDb;
      mfaCache: IMFACache;
      mfaAttemptCache: IMfaAttemptCache;
      authenticator: typeof authenticator;
      userUtilService: UserUtilServiceType;
      securityMonitorService: SecurityMonitorServiceType;
      auditLogService: AuditLogService;
    } = {
      db,
      mfaCache,
      mfaAttemptCache,
      authenticator,
      userUtilService,
      securityMonitorService,
      auditLogService,
    },
  ) {}

  async verifyAndCompleteLogin(
    params: VerifyAndCompleteLoginParams,
  ): Promise<ILoginRes> {
    const { mfaToken, otp, backupCode } = params;
    const { clientIp, userAgent } = getIpAndUa();

    if (!otp && !backupCode) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Either otp or backupCode is required',
      });
    }

    const attemptKey = `mfa:${mfaToken}`;
    const attempts = (await this.deps.mfaAttemptCache.get(attemptKey)) ?? 0;

    if (attempts >= this.MAX_MFA_ATTEMPTS) {
      await this.logMfaError('TOO_MANY_ATTEMPTS', null, clientIp, userAgent);
      throw new BadReqErr(ErrCode.TooManyAttempts);
    }

    await this.deps.mfaAttemptCache.set(
      attemptKey,
      attempts + 1,
      this.MFA_ATTEMPT_TTL,
    );

    const cachedData = await this.deps.mfaCache.get(mfaToken);
    if (!cachedData) {
      await this.logMfaError('SESSION_EXPIRED', null, clientIp, userAgent);
      throw new BadReqErr(ErrCode.SessionExpired);
    }

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
      await this.logMfaError(
        'USER_NOT_FOUND',
        cachedData.userId,
        clientIp,
        userAgent,
      );
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    if (user.status !== UserStatus.active) {
      await this.logMfaError('USER_NOT_ACTIVE', user.id, clientIp, userAgent);
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    let isValid = false;

    if (otp) {
      if (!user.totpSecret) {
        await this.logMfaError('USER_NOT_FOUND', user.id, clientIp, userAgent);
        throw new NotFoundErr(ErrCode.UserNotFound);
      }

      isValid = this.deps.authenticator.verify({
        secret: user.totpSecret,
        token: otp,
      });

      if (!isValid) {
        await this.logMfaError('INVALID_OTP', user.id, clientIp, userAgent);
        throw new BadReqErr(ErrCode.InvalidOtp);
      }
    } else if (backupCode) {
      isValid = await this.verifyBackupCode(user, backupCode);
      if (!isValid) {
        await this.logMfaError(
          'INVALID_BACKUP_CODE',
          user.id,
          clientIp,
          userAgent,
        );
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
        await this.logMfaError(
          'SECURITY_BLOCKED',
          user.id,
          clientIp,
          userAgent,
        );
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

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: otp ? 'email' : 'backup-code' },
    });

    return loginRes;
  }

  private async verifyBackupCode(
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

    const backupCodes = JSON.parse(user.backupCodes) as string[];
    const usedCodes = user.backupCodesUsed
      ? (JSON.parse(user.backupCodesUsed) as string[])
      : [];

    const crypto = await import('node:crypto');
    const hashedCode = crypto
      .createHash('sha256')
      .update(backupCode)
      .digest('hex');

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

  private async logMfaError(
    errorType: keyof typeof MFA_ERROR_PAYLOADS,
    userId: string | null,
    clientIp: string,
    userAgent: string,
  ): Promise<void> {
    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: MFA_ERROR_PAYLOADS[errorType],
      userId: userId ?? undefined,
    });
  }
}

export const mfaVerificationService = new MfaVerificationService();
