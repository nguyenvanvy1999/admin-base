import crypto from 'node:crypto';
import {
  ACTIVITY_TYPE,
  type IDisableMfaParams,
  type IMfaStatus,
  type IMfaUser,
  PurposeVerify,
} from 'src/share';
import { BaseMfaService } from './base-mfa.service';
import { MfaErrorHandler } from './mfa-error-handler';

type SetupMfaRequestParams = {
  userId: string;
  sessionId: string;
};

type SetupMfaParams = {
  mfaToken: string;
  otp: string;
  clientIp?: string;
  userAgent?: string;
};

type ResetMfaParams = {
  otpToken: string;
  otp: string;
};

export class MfaSetupService extends BaseMfaService {
  async setupMfaRequest(params: SetupMfaRequestParams) {
    const { userId, sessionId } = params;

    await this.validateMfaNotEnabled(userId);

    const mfaToken = this.generateToken();
    const totpSecret = this.generateTotpSecret();

    await this.deps.mfaSetupCache.set(mfaToken, {
      totpSecret,
      userId,
      sessionId,
    });

    await this.logActivity(
      ACTIVITY_TYPE.SETUP_MFA,
      { method: 'totp', stage: 'request' },
      userId,
      sessionId,
    );

    return {
      mfaToken,
      totpSecret,
    };
  }

  async setupMfa(params: SetupMfaParams) {
    const { mfaToken, otp, clientIp, userAgent } = params;

    const cachedData = await this.deps.mfaSetupCache.get(mfaToken);
    if (!cachedData) {
      MfaErrorHandler.handleSessionExpired();
    }

    if (!this.verifyTotp(cachedData.totpSecret, otp)) {
      MfaErrorHandler.handleInvalidOtp();
    }

    await this.deps.db.user.update({
      where: { id: cachedData.userId },
      data: {
        totpSecret: cachedData.totpSecret,
        mfaTotpEnabled: true,
      },
      select: { id: true },
    });

    await this.logActivity(
      ACTIVITY_TYPE.SETUP_MFA,
      { method: 'totp', stage: 'confirm' },
      cachedData.userId,
      cachedData.sessionId,
      clientIp,
      userAgent,
    );

    if (cachedData.sessionId) {
      await this.deps.sessionService.revoke(cachedData.userId, [
        cachedData.sessionId,
      ]);
    }

    return null;
  }

  async disableMfa(params: IDisableMfaParams) {
    const { userId, sessionId, otp, backupCode, clientIp, userAgent } = params;

    await this.validateMfaEnabled(userId);
    const mfaUser = await this.findMfaUserById(userId);

    let isValid = false;

    if (otp && mfaUser.totpSecret) {
      isValid = this.verifyTotp(mfaUser.totpSecret, otp);
    } else if (backupCode && mfaUser.backupCodes) {
      isValid = await this.validateBackupCode(mfaUser, backupCode);
    }

    if (!isValid) {
      if (otp) {
        MfaErrorHandler.handleInvalidOtp();
      } else {
        MfaErrorHandler.handleInvalidBackupCode();
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

    await this.deps.sessionService.revoke(userId);

    await this.logActivity(
      ACTIVITY_TYPE.RESET_MFA,
      { method: 'disable' },
      userId,
      sessionId,
      clientIp,
      userAgent,
    );

    return null;
  }

  async resetMfa(params: ResetMfaParams) {
    const { otpToken, otp } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.RESET_MFA,
      otp,
    );

    if (!userId) {
      MfaErrorHandler.handleInvalidOtp();
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

    await this.deps.sessionService.revoke(userId);
    await this.logActivity(
      ACTIVITY_TYPE.RESET_MFA,
      { method: 'reset' },
      userId,
    );

    return null;
  }

  async getMfaStatus(userId: string): Promise<IMfaStatus> {
    const mfaUser = await this.findMfaUserById(userId);

    const hasBackupCodes = Boolean(mfaUser.backupCodes);
    let backupCodesRemaining = 0;

    if (hasBackupCodes && mfaUser.backupCodes) {
      const backupCodes = JSON.parse(mfaUser.backupCodes) as string[];
      const usedCodes = mfaUser.backupCodesUsed
        ? (JSON.parse(mfaUser.backupCodesUsed) as string[])
        : [];
      backupCodesRemaining = backupCodes.length - usedCodes.length;
    }

    return {
      enabled: mfaUser.mfaTotpEnabled,
      hasBackupCodes,
      backupCodesRemaining,
    };
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

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

export const mfaSetupService = new MfaSetupService();
