import crypto from 'node:crypto';
import { mfaCache } from 'src/config/cache';
import {
  ACTIVITY_TYPE,
  type IBackupCodesData,
  type IBackupCodesRemaining,
  type IGenerateBackupCodesParams,
  type IMfaUser,
  type IVerifyBackupCodeParams,
} from 'src/share';
import { BaseMfaService } from './base-mfa.service';
import { MfaErrorHandler } from './mfa-error-handler';
import { mfaUtilService } from './mfa-util.service';

export class MfaBackupService extends BaseMfaService {
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  async generateBackupCodes(
    params: IGenerateBackupCodesParams,
  ): Promise<IBackupCodesData> {
    const { userId, sessionId, otp, clientIp, userAgent } = params;

    await this.validateMfaEnabled(userId);
    const mfaUser = await this.findMfaUserById(userId);

    if (!mfaUser.totpSecret) {
      MfaErrorHandler.handleMfaBroken();
    }

    if (!this.verifyTotp(mfaUser.totpSecret, otp)) {
      MfaErrorHandler.handleInvalidOtp();
    }

    const codes = this.createBackupCodes();
    const hashedCodes = codes.map((code) => this.hashBackupCode(code));

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        backupCodes: JSON.stringify(hashedCodes),
        backupCodesUsed: JSON.stringify([]),
      },
      select: { id: true },
    });

    await this.logActivity(
      ACTIVITY_TYPE.SETUP_MFA,
      { method: 'backup-codes', stage: 'generate' },
      userId,
      sessionId,
      clientIp,
      userAgent,
    );

    return {
      codes,
      hashedCodes,
    };
  }

  async verifyBackupCode(params: IVerifyBackupCodeParams): Promise<string> {
    const { mfaToken, loginToken, backupCode, clientIp, userAgent } = params;

    MfaErrorHandler.validateBackupCode(backupCode);

    const cachedData = await mfaCache.get(
      mfaUtilService.getKey(mfaToken, loginToken),
    );

    if (!cachedData) {
      MfaErrorHandler.handleSessionExpired();
    }

    const mfaUser = await this.findMfaUserById(cachedData.userId);

    if (!mfaUser.mfaTotpEnabled || !mfaUser.backupCodes) {
      MfaErrorHandler.handleMfaNotEnabled();
    }

    const isValid = await this.validateBackupCode(mfaUser, backupCode);
    if (!isValid) {
      MfaErrorHandler.handleInvalidBackupCode();
    }

    await this.markBackupCodeAsUsed(mfaUser.id, backupCode);

    await this.logActivity(
      ACTIVITY_TYPE.LOGIN,
      { method: 'backup-code' },
      mfaUser.id,
      undefined,
      clientIp,
      userAgent,
    );

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
      MfaErrorHandler.handleBackupCodeAlreadyUsed();
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

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        backupCodesUsed: JSON.stringify(usedCodes),
      },
      select: { id: true },
    });
  }
}

export const mfaBackupService = new MfaBackupService();
