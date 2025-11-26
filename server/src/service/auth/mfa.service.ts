import { authenticator } from 'otplib';
import { mfaSetupCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { type OtpService, otpService } from 'src/service/auth/otp.service';
import {
  type SessionService,
  sessionService,
} from 'src/service/auth/session.service';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  ErrCode,
  IdUtil,
  NotFoundErr,
  PurposeVerify,
} from 'src/share';

type IMfaSetupCache = typeof mfaSetupCache;

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

export class MfaService {
  constructor(
    private readonly deps: {
      db: IDb;
      mfaSetupCache: IMfaSetupCache;
      authenticator: typeof authenticator;
      sessionService: SessionService;
      otpService: OtpService;
      auditLogService: AuditLogService;
      idUtil: typeof IdUtil;
    } = {
      db,
      mfaSetupCache,
      authenticator,
      sessionService,
      otpService,
      auditLogService,
      idUtil: IdUtil,
    },
  ) {}

  async setupMfaRequest(params: SetupMfaRequestParams) {
    const { userId, sessionId } = params;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { mfaTotpEnabled: true },
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    if (user.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MFAHasBeenSetup);
    }

    const mfaToken = this.deps.idUtil.token16();

    const totpSecret = this.deps.authenticator.generateSecret().toUpperCase();
    await this.deps.mfaSetupCache.set(mfaToken, {
      totpSecret,
      userId,
      sessionId,
    });

    await this.deps.auditLogService.push({
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

    const cachedData = await this.deps.mfaSetupCache.get(mfaToken);
    if (!cachedData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    if (
      !this.deps.authenticator.verify({
        secret: cachedData.totpSecret,
        token: otp,
      })
    ) {
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

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.SETUP_MFA,
      payload: { method: 'totp', stage: 'confirm' },
      userId: cachedData.userId,
      sessionId: cachedData.sessionId,
      ip: clientIp,
      userAgent,
    });

    if (cachedData.sessionId) {
      await this.deps.sessionService.revoke(cachedData.userId, [
        cachedData.sessionId,
      ]);
    }

    return null;
  }

  async resetMfa(params: ResetMfaParams) {
    const { otpToken, otp } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        mfaTotpEnabled: false,
      },
      select: { id: true },
    });

    await this.deps.sessionService.revoke(userId);
    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.RESET_MFA,
      payload: {},
      userId,
    });

    return null;
  }
}

export const mfaService = new MfaService();
