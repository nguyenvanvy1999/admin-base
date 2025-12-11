import { authenticator } from 'otplib';
import {
  type IMFACache,
  type IMfaAttemptCache,
  mfaAttemptCache,
  mfaCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type {
  ILoginRes,
  VerifyAndCompleteLoginParams,
} from 'src/dtos/auth.dto';
import { SecurityEventType, UserStatus } from 'src/generated';
import {
  hashBackupCode,
  parseBackupCodes,
  parseUsedBackupCodes,
} from 'src/service/auth/backup-code.util';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import { securityEventService } from 'src/service/misc/security-event.service';
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
        await Promise.all([
          this.logMfaError('INVALID_OTP', user.id),
          securityEventService.create({
            userId: user.id,
            eventType: SecurityEventType.mfa_failed,
            ip: clientIp,
            userAgent,
            metadata: { method: 'totp', reason: 'invalid_otp' },
          }),
        ]);
        throw new BadReqErr(ErrCode.InvalidOtp);
      }
    } else if (backupCode) {
      isValid = await this.verifyBackupCode(user, backupCode);
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

    await Promise.all([
      this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: otp ? 'email' : 'backup-code' },
      }),
      securityEventService.create({
        userId: user.id,
        eventType: SecurityEventType.mfa_verified,
        ip: clientIp,
        userAgent,
        metadata: { method: otp ? 'totp' : 'backup_code' },
      }),
    ]);

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

  private async logMfaError(
    errorType: keyof typeof MFA_ERROR_PAYLOADS,
    userId?: string,
  ): Promise<void> {
    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: MFA_ERROR_PAYLOADS[errorType],
      userId,
    });
  }
}

export const mfaVerificationService = new MfaVerificationService();
