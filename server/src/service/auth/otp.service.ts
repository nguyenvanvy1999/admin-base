import {
  type IOTPCache,
  type IOtpRateLimitCache,
  otpCache,
  otpRateLimitCache,
} from 'src/config/cache';
import { emailQueue, type IEmailQueue } from 'src/config/queue';
import {
  type LockingService,
  lockingService,
} from 'src/service/misc/locking.service';
import { EmailType, IdUtil, type PurposeVerify } from 'src/share';

export class OtpService {
  constructor(
    private readonly deps: {
      otpCache: IOTPCache;
      otpRateLimitCache: IOtpRateLimitCache;
      lockingService: LockingService;
      emailQueue: IEmailQueue;
    } = { otpCache, otpRateLimitCache, lockingService, emailQueue },
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
}

export const otpService = new OtpService({
  otpCache,
  otpRateLimitCache,
  lockingService,
  emailQueue,
});
