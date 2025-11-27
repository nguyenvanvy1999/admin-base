import crypto from 'node:crypto';
import { authenticator } from 'otplib';
import { mfaSetupCache } from 'src/config/cache';
import { db } from 'src/config/db';
import { otpService } from 'src/service/auth/otp.service';
import { sessionService } from 'src/service/auth/session.service';
import { auditLogService } from 'src/service/misc/audit-log.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  ErrCode,
  type IDisableMfaParams,
  IdUtil,
  type IMfaStatus,
  type IMfaUser,
  NotFoundErr,
  PurposeVerify,
} from 'src/share';

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

export class MfaSetupService {
  async setupMfaRequest(params: SetupMfaRequestParams) {
    const { userId, sessionId } = params;

    await this.ensureMfaNotEnabled(userId);

    const mfaToken = this.generateToken();
    const totpSecret = this.generateTotpSecret();

    await mfaSetupCache.set(mfaToken, {
      totpSecret,
      userId,
      sessionId,
    });

    await auditLogService.push({
      type: ACTIVITY_TYPE.SETUP_MFA,
      payload: { method: 'totp', stage: 'request' },
      userId,
      sessionId,
    });

    return {
      mfaToken,
      totpSecret,
    };
  }

  async setupMfa(params: SetupMfaParams) {
    const { mfaToken, otp, clientIp, userAgent } = params;

    const cachedData = await mfaSetupCache.get(mfaToken);
    if (!cachedData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    const totpVerified = authenticator.verify({
      secret: cachedData.totpSecret,
      token: otp,
    });

    if (!totpVerified) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await db.user.update({
      where: { id: cachedData.userId },
      data: {
        totpSecret: cachedData.totpSecret,
        mfaTotpEnabled: true,
      },
      select: { id: true },
    });

    await auditLogService.push({
      type: ACTIVITY_TYPE.SETUP_MFA,
      payload: { method: 'totp', stage: 'confirm' },
      userId: cachedData.userId,
      sessionId: cachedData.sessionId,
      ip: clientIp,
      userAgent,
    });

    if (cachedData.sessionId) {
      await sessionService.revoke(cachedData.userId, [cachedData.sessionId]);
    }

    return null;
  }

  async disableMfa(params: IDisableMfaParams) {
    const { userId, sessionId, otp, backupCode, clientIp, userAgent } = params;

    const mfaUser = await this.findMfaUserById(userId);
    if (!mfaUser.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MFANotEnabled);
    }

    let isValid = false;

    if (otp && mfaUser.totpSecret) {
      isValid = authenticator.verify({
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

    await db.user.update({
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

    await auditLogService.push({
      type: ACTIVITY_TYPE.RESET_MFA,
      payload: { method: 'disable' },
      userId,
      sessionId,
      ip: clientIp,
      userAgent,
    });

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
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await db.user.update({
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
    await auditLogService.push({
      type: ACTIVITY_TYPE.RESET_MFA,
      payload: { method: 'reset' },
      userId,
    });

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
      throw new BadReqErr(ErrCode.BackupCodeAlreadyUsed);
    }

    return backupCodes.includes(hashedCode);
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
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

  private async ensureMfaNotEnabled(userId: string) {
    const user = await db.user.findUnique({
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

  private generateToken(): string {
    return IdUtil.token16();
  }

  private generateTotpSecret(): string {
    return authenticator.generateSecret().toUpperCase();
  }
}

export const mfaSetupService = new MfaSetupService();
