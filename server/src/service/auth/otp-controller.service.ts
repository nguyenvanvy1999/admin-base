import { type RedisCache, registerOtpLimitCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { UserStatus } from 'src/generated';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  type SettingService,
  settingService,
} from 'src/service/misc/setting.service';
import { ACTIVITY_TYPE, PurposeVerify } from 'src/share';
import { type OtpService, otpService } from './otp.service';

export class OtpControllerService {
  constructor(
    private readonly deps: {
      db: IDb;
      otpService: OtpService;
      auditLogService: AuditLogService;
      settingService: SettingService;
      registerOtpLimitCache: RedisCache<number>;
    } = {
      db,
      otpService,
      auditLogService,
      settingService,
      registerOtpLimitCache,
    },
  ) {}

  async checkOtpConditions(
    user: {
      id: string;
      status: UserStatus;
      password: string | null;
      mfaTotpEnabled: boolean;
    },
    purpose: PurposeVerify,
  ): Promise<boolean> {
    switch (purpose) {
      case PurposeVerify.REGISTER: {
        const limit = await this.deps.registerOtpLimitCache.get(user.id);
        const otpLimit = await this.deps.settingService.registerOtpLimit();
        if (limit && limit >= otpLimit) {
          await this.deps.db.user.update({
            where: { id: user.id },
            data: { status: UserStatus.suspendded },
            select: { id: true },
          });
          return false;
        }

        return user.status === UserStatus.inactive;
      }

      case PurposeVerify.FORGOT_PASSWORD: {
        return Boolean(user.password);
      }

      case PurposeVerify.RESET_MFA: {
        return user.mfaTotpEnabled;
      }

      default:
        return false;
    }
  }

  async updateRegisterOtpLimit(userId: string): Promise<void> {
    const current = await this.deps.registerOtpLimitCache.get(userId);
    const nextValue = current ? current + 1 : 1;
    await this.deps.registerOtpLimitCache.set(userId, nextValue);
  }

  async sendOtpWithAudit(
    email: string,
    purpose: PurposeVerify,
  ): Promise<{ otpToken: string } | null> {
    email = email.toLowerCase();

    const user = await this.deps.db.user.findUnique({
      where: { email },
      select: { id: true, status: true, password: true, mfaTotpEnabled: true },
    });

    if (!user) {
      const activityType =
        purpose === PurposeVerify.REGISTER
          ? ACTIVITY_TYPE.REGISTER
          : ACTIVITY_TYPE.LOGIN;
      await this.deps.auditLogService.push({
        type: activityType,
        payload: {
          method: 'email',
          error: 'user_not_found',
          ...(purpose !== PurposeVerify.REGISTER && {
            action: `otp_${purpose}`,
          }),
        },
      });
      return null;
    }

    const allowed = await this.checkOtpConditions(user, purpose);
    if (!allowed) {
      const activityType =
        purpose === PurposeVerify.REGISTER
          ? ACTIVITY_TYPE.REGISTER
          : ACTIVITY_TYPE.LOGIN;
      await this.deps.auditLogService.push({
        type: activityType,
        payload: {
          method: 'email',
          error: 'otp_conditions_not_met',
          ...(purpose !== PurposeVerify.REGISTER && {
            action: `otp_${purpose}`,
          }),
        },
        userId: user.id,
      });
      return null;
    }

    const otpToken = await this.deps.otpService.sendOtp(
      user.id,
      email,
      purpose,
    );
    if (!otpToken) {
      const activityType =
        purpose === PurposeVerify.REGISTER
          ? ACTIVITY_TYPE.REGISTER
          : ACTIVITY_TYPE.LOGIN;
      await this.deps.auditLogService.push({
        type: activityType,
        payload: {
          method: 'email',
          error: 'otp_send_failed',
          ...(purpose !== PurposeVerify.REGISTER && {
            action: `otp_${purpose}`,
          }),
        },
        userId: user.id,
      });
      return null;
    }

    const activityType =
      purpose === PurposeVerify.REGISTER
        ? ACTIVITY_TYPE.REGISTER
        : ACTIVITY_TYPE.LOGIN;
    await this.deps.auditLogService.push({
      type: activityType,
      payload: {
        method: 'email',
        ...(purpose !== PurposeVerify.REGISTER && {
          action: `otp_sent_${purpose}`,
        }),
      },
      userId: user.id,
    });

    if (purpose === PurposeVerify.REGISTER) {
      await this.updateRegisterOtpLimit(user.id);
    }

    return { otpToken };
  }
}

export const otpControllerService = new OtpControllerService({
  db,
  otpService,
  auditLogService,
  settingService,
  registerOtpLimitCache,
});
