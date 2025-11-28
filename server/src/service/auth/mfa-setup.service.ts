import crypto from 'node:crypto';
import { authenticator } from 'otplib';
import {
  mfaCache,
  mfaSetupCache,
  mfaSetupTokenByUserCache,
  mfaSetupTokenCache,
} from 'src/config/cache';
import { db } from 'src/config/db';
import { otpService } from 'src/service/auth/otp.service';
import { sessionService } from 'src/service/auth/session.service';
import { auditLogService } from 'src/service/misc/audit-log.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  ctxStore,
  ErrCode,
  type IDisableMfaParams,
  IdUtil,
  type IMfaStatus,
  type IMfaUser,
  isExpired,
  NotFoundErr,
  PurposeVerify,
  type SecurityDeviceInsight,
} from 'src/share';

type SetupMfaRequestParams = {
  setupToken?: string;
};

type SetupMfaParams = {
  mfaToken: string;
  otp: string;
};

type ResetMfaParams = {
  otpToken: string;
  otp: string;
};

export class MfaSetupService {
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

    const mfaToken = this.generateToken();
    const totpSecret = this.generateTotpSecret();

    await mfaSetupCache.set(mfaToken, {
      totpSecret,
      userId,
      sessionId: sessionId || '',
      setupToken: undefined,
      createdAt: Date.now(),
    });

    await auditLogService.push({
      type: ACTIVITY_TYPE.SETUP_MFA,
      payload: { method: 'totp', stage: 'request' },
    });

    return {
      mfaToken,
      totpSecret,
    };
  }

  private async setupMfaRequestForUnauthenticatedUser(setupToken: string) {
    const tokenData = await mfaSetupTokenCache.get(setupToken);
    if (!tokenData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    await this.ensureMfaNotEnabled(tokenData.userId);

    const mfaToken = this.generateToken();
    const totpSecret = this.generateTotpSecret();

    await mfaSetupCache.set(mfaToken, {
      totpSecret,
      userId: tokenData.userId,
      sessionId: '',
      setupToken,
      createdAt: Date.now(),
    });

    await mfaSetupTokenCache.del(setupToken);

    await auditLogService.push({
      type: ACTIVITY_TYPE.SETUP_MFA,
      payload: { method: 'totp', stage: 'request' },
    });

    return {
      mfaToken,
      totpSecret,
    };
  }

  async setupMfa(params: SetupMfaParams) {
    const { mfaToken, otp } = params;

    const cachedData = await mfaSetupCache.get(mfaToken);
    if (!cachedData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    let securityContext: SecurityDeviceInsight | undefined;

    if (cachedData.setupToken) {
      const tokenData = await mfaSetupTokenCache.get(cachedData.setupToken);
      if (!tokenData) {
        throw new BadReqErr(ErrCode.SessionExpired);
      }
      securityContext = tokenData.security;
    }

    if (cachedData.sessionId) {
      await this.validateSessionActive(cachedData.sessionId, cachedData.userId);
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

    const loginToken = IdUtil.token16();

    await mfaCache.set(mfaToken, {
      userId: cachedData.userId,
      loginToken,
      createdAt: Date.now(),
      security: securityContext,
    });

    await auditLogService.push({
      type: ACTIVITY_TYPE.SETUP_MFA,
      payload: { method: 'totp', stage: 'confirm' },
    });

    if (cachedData.sessionId) {
      await sessionService.revoke(cachedData.userId, [cachedData.sessionId]);
    }

    if (cachedData.setupToken) {
      await mfaSetupTokenCache.del(cachedData.setupToken);
      await mfaSetupTokenByUserCache.del(cachedData.userId);
    }

    await mfaSetupCache.del(mfaToken);

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
      await auditLogService.push({
        type: ACTIVITY_TYPE.RESET_MFA,
        payload: { method: 'reset', error: 'invalid_otp' },
      });
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
    const hashedCode = crypto
      .createHash('sha256')
      .update(backupCode)
      .digest('hex');

    if (usedCodes.includes(hashedCode)) {
      throw new BadReqErr(ErrCode.BackupCodeAlreadyUsed);
    }

    return backupCodes.includes(hashedCode);
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

  private async validateSessionActive(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const session = await db.session.findUnique({
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

export const mfaSetupService = new MfaSetupService();
