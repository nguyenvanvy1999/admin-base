import { authenticator } from 'otplib';
import { db } from 'src/config/db';
import type {
  ILoginRes,
  VerifyAndCompleteLoginParams,
} from 'src/dtos/auth.dto';
import {
  generateBackupCodes,
  hashBackupCode,
  parseBackupCodes,
  parseUsedBackupCodes,
} from 'src/service/auth/backup-code.util';
import { mfaVerificationService } from 'src/service/auth/mfa-verification.service';
import { auditLogService } from 'src/service/misc/audit-log.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  ctxStore,
  ErrCode,
  type IBackupCodesData,
  type IBackupCodesRemaining,
  type IGenerateBackupCodesParams,
  type IUserMFA,
  NotFoundErr,
  UnAuthErr,
} from 'src/share';

export class MfaBackupService {
  async generateBackupCodes(
    params: IGenerateBackupCodesParams,
  ): Promise<IBackupCodesData> {
    const { otp } = params;
    const { userId } = ctxStore.getStore() ?? {};
    if (!userId) {
      throw new UnAuthErr(ErrCode.InvalidToken, {
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

    const totpVerified = authenticator.verify({
      secret: mfaUser.totpSecret,
      token: otp,
    });

    if (!totpVerified) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const codes = generateBackupCodes();
    const hashedCodes = codes.map((code) => hashBackupCode(code));

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
    });

    return {
      codes,
      hashedCodes,
    };
  }

  verifyBackupCode(params: VerifyAndCompleteLoginParams): Promise<ILoginRes> {
    return mfaVerificationService.verifyAndCompleteLogin(params);
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

  private async findMfaUserById(userId: string): Promise<IUserMFA> {
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
