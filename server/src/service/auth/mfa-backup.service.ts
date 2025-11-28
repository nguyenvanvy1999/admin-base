import crypto from 'node:crypto';
import { authenticator } from 'otplib';
import { mfaCache } from 'src/config/cache';
import { db } from 'src/config/db';
import { auditLogService } from 'src/service/misc/audit-log.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  ErrCode,
  type IBackupCodesData,
  type IBackupCodesRemaining,
  type IGenerateBackupCodesParams,
  type IMfaUser,
  type IVerifyBackupCodeParams,
  NotFoundErr,
} from 'src/share';

export class MfaBackupService {
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  async generateBackupCodes(
    params: IGenerateBackupCodesParams,
  ): Promise<IBackupCodesData> {
    const { userId, sessionId, otp, clientIp, userAgent } = params;

    const mfaUser = await this.findMfaUserById(userId);
    if (!mfaUser.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MFANotEnabled);
    }

    if (!mfaUser.totpSecret) {
      throw new BadReqErr(ErrCode.MfaBroken);
    }

    const totpVerified = authenticator.verify({
      secret: mfaUser.totpSecret,
      token: otp,
    });

    if (!totpVerified) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const codes = this.createBackupCodes();
    const hashedCodes = codes.map((code) => this.hashBackupCode(code));

    await db.user.update({
      where: { id: userId },
      data: {
        backupCodes: JSON.stringify(hashedCodes),
        backupCodesUsed: JSON.stringify([]),
      },
      select: { id: true },
    });

    await auditLogService.push({
      type: ACTIVITY_TYPE.SETUP_MFA,
      payload: { method: 'backup-codes', stage: 'generate' },
      userId,
      sessionId,
      ip: clientIp,
      userAgent,
    });

    return {
      codes,
      hashedCodes,
    };
  }

  async verifyBackupCode(params: IVerifyBackupCodeParams): Promise<string> {
    const { mfaToken, backupCode, clientIp, userAgent } = params;

    if (!backupCode || backupCode.length !== 8) {
      throw new BadReqErr(ErrCode.InvalidBackupCode);
    }

    const cachedData = await mfaCache.get(mfaToken);

    if (!cachedData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    const mfaUser = await this.findMfaUserById(cachedData.userId);

    if (!mfaUser.mfaTotpEnabled || !mfaUser.backupCodes) {
      throw new BadReqErr(ErrCode.MFANotEnabled);
    }

    const isValid = this.validateBackupCode(mfaUser, backupCode);
    if (!isValid) {
      throw new BadReqErr(ErrCode.InvalidBackupCode);
    }

    await this.markBackupCodeAsUsed(mfaUser.id, backupCode);

    await auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'backup-code' },
      userId: mfaUser.id,
      sessionId: undefined,
      ip: clientIp,
      userAgent,
    });

    return cachedData.userId;
  }

  async getBackupCodesRemaining(
    userId: string,
  ): Promise<IBackupCodesRemaining> {
    const mfaUser = await this.findMfaUserById(userId);

    if (!mfaUser.mfaTotpEnabled || !mfaUser.backupCodes) {
      return { remaining: 0, total: 0 };
    }

    const backupCodes = JSON.parse(mfaUser.backupCodes) as string[];
    const usedCodes = mfaUser.backupCodesUsed
      ? (JSON.parse(mfaUser.backupCodesUsed) as string[])
      : [];

    return {
      remaining: backupCodes.length - usedCodes.length,
      total: backupCodes.length,
    };
  }

  private createBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      codes.push(this.generateBackupCode());
    }

    return codes;
  }

  private generateBackupCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';

    for (let i = 0; i < this.BACKUP_CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private validateBackupCode(user: IMfaUser, backupCode: string): boolean {
    if (!user.backupCodes) {
      return false;
    }

    const backupCodes = JSON.parse(user.backupCodes) as string[];
    const usedCodes = user.backupCodesUsed
      ? (JSON.parse(user.backupCodesUsed) as string[])
      : [];
    const hashedCode = this.hashBackupCode(backupCode);

    if (usedCodes.includes(hashedCode)) {
      throw new BadReqErr(ErrCode.BackupCodeAlreadyUsed);
    }

    return backupCodes.includes(hashedCode);
  }

  private async markBackupCodeAsUsed(
    userId: string,
    backupCode: string,
  ): Promise<void> {
    const mfaUser = await this.findMfaUserById(userId);
    const hashedCode = this.hashBackupCode(backupCode);
    const usedCodes = mfaUser.backupCodesUsed
      ? (JSON.parse(mfaUser.backupCodesUsed) as string[])
      : [];

    usedCodes.push(hashedCode);

    await db.user.update({
      where: { id: userId },
      data: {
        backupCodesUsed: JSON.stringify(usedCodes),
      },
      select: { id: true },
    });
  }

  private async findMfaUserById(userId: string): Promise<IMfaUser> {
    const user = await db.user.findUnique({
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

export const mfaBackupService = new MfaBackupService();
