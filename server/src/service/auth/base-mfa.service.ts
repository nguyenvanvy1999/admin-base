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
  type ACTIVITY_TYPE,
  BadReqErr,
  ErrCode,
  IdUtil,
  NotFoundErr,
} from 'src/share';

type IMfaSetupCache = typeof mfaSetupCache;

export interface BaseMfaDependencies {
  db: IDb;
  mfaSetupCache: IMfaSetupCache;
  authenticator: typeof authenticator;
  sessionService: SessionService;
  otpService: OtpService;
  auditLogService: AuditLogService;
  idUtil: typeof IdUtil;
}

export abstract class BaseMfaService {
  protected readonly deps: BaseMfaDependencies;

  constructor(deps?: Partial<BaseMfaDependencies>) {
    this.deps = {
      db,
      mfaSetupCache,
      authenticator,
      sessionService,
      otpService,
      auditLogService,
      idUtil: IdUtil,
      ...deps,
    };
  }

  protected async findUserById(userId: string, select?: any) {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: select || {
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

  protected async findMfaUserById(userId: string): Promise<{
    id: string;
    mfaTotpEnabled: boolean;
    totpSecret: string | null;
    backupCodes: string | null;
    backupCodesUsed: string | null;
  }> {
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

  protected async validateMfaEnabled(userId: string) {
    const user = await this.findUserById(userId, { mfaTotpEnabled: true });

    if (!user.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MfaBroken);
    }

    return user;
  }

  protected async validateMfaNotEnabled(userId: string) {
    const user = await this.findUserById(userId, { mfaTotpEnabled: true });

    if (user.mfaTotpEnabled) {
      throw new BadReqErr(ErrCode.MFAHasBeenSetup);
    }

    return user;
  }

  protected async logActivity(
    type: ACTIVITY_TYPE,
    payload: any,
    userId: string,
    sessionId?: string,
    clientIp?: string,
    userAgent?: string,
  ) {
    await this.deps.auditLogService.push({
      type,
      payload,
      userId,
      sessionId,
      ip: clientIp,
      userAgent,
    });
  }

  protected generateToken(): string {
    return this.deps.idUtil.token16();
  }

  protected verifyTotp(secret: string, token: string): boolean {
    return this.deps.authenticator.verify({
      secret,
      token,
    });
  }

  protected generateTotpSecret(): string {
    return this.deps.authenticator.generateSecret().toUpperCase();
  }
}
