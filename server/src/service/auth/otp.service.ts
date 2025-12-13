import {
  type IOTPCache,
  type IOtpRateLimitCache,
  otpCache,
  otpRateLimitCache,
  type RedisCache,
  registerOtpLimitCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { emailQueue, type IEmailQueue } from 'src/config/queue';
import { UserStatus } from 'src/generated';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  type LockingService,
  lockingService,
} from 'src/service/misc/locking.service';
import {
  type SettingService,
  settingService,
} from 'src/service/misc/setting.service';
import { ACTIVITY_TYPE, EmailType, IdUtil, PurposeVerify } from 'src/share';

export class OtpService {
  constructor(
    private readonly deps: {
      db: IDb;
      otpCache: IOTPCache;
      otpRateLimitCache: IOtpRateLimitCache;
      registerOtpLimitCache: RedisCache<number>;
      lockingService: LockingService;
      emailQueue: IEmailQueue;
      auditLogService: AuditLogService;
      settingService: SettingService;
    } = {
      db,
      otpCache,
      otpRateLimitCache,
      registerOtpLimitCache,
      lockingService,
      emailQueue,
      auditLogService,
      settingService,
    },
  ) {}

  async generateOtp(
    id: string,
    purpose: PurposeVerify,
    userId: string,
  ): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.deps.otpCache.set(id, { otp, purpose, userId });
    return otp;
  }

  async verifyOtp(
    id: string,
    purpose: PurposeVerify,
    otp: string,
  ): Promise<string | null> {
    const storedOtp = await this.deps.otpCache.get(id);
    if (storedOtp?.otp === otp && storedOtp?.purpose === purpose) {
      await this.deps.otpCache.del(id);
      return storedOtp.userId;
    }
    return null;
  }

  sendOtp(
    userId: string,
    email: string,
    purpose: PurposeVerify,
  ): Promise<string | null> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    const key = `${email}_${purpose}`;
    return this.deps.lockingService.lock(key, async () => {
      email = email.toLowerCase();
      const isRateLimited = await this.deps.otpRateLimitCache.get(key);
      if (isRateLimited) {
        return null;
      }
      const otpToken = IdUtil.token16();
      const otp = await this.generateOtp(otpToken, purpose, userId);
      await this.deps.emailQueue.add(EmailType.OTP, {
        [EmailType.OTP]: { email, otp, purpose },
      });
      await this.deps.otpRateLimitCache.set(key, true);
      return otpToken;
    });
  }

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

    const otpToken = await this.sendOtp(user.id, email, purpose);
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

export const otpService = new OtpService({
  db,
  otpCache,
  otpRateLimitCache,
  registerOtpLimitCache,
  lockingService,
  emailQueue,
  auditLogService,
  settingService,
});
