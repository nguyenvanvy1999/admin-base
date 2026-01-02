import type {
  IOTPCache,
  IOtpRateLimitCache,
  RedisCache,
} from 'src/config/cache';
import type { PurposeVerify } from 'src/share';

export interface IOtpRepository {
  generateOtp(
    id: string,
    purpose: PurposeVerify,
    userId: string,
  ): Promise<string>;
  verifyOtp(
    id: string,
    purpose: PurposeVerify,
    otp: string,
  ): Promise<{ userId: string; purpose: PurposeVerify } | null>;
  deleteOtp(id: string): Promise<void>;
  checkRateLimit(key: string): Promise<boolean>;
  setRateLimit(key: string): Promise<void>;
  getRegisterOtpLimit(userId: string): Promise<number | null>;
  incrementRegisterOtpLimit(userId: string): Promise<void>;
}

export class OtpRepository implements IOtpRepository {
  constructor(
    private readonly otpCache: IOTPCache = otpCache,
    private readonly otpRateLimitCache: IOtpRateLimitCache = otpRateLimitCache,
    private readonly registerOtpLimitCache: RedisCache<number> = registerOtpLimitCache,
  ) {}

  async generateOtp(
    id: string,
    purpose: PurposeVerify,
    userId: string,
  ): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.otpCache.set(id, { otp, purpose, userId });
    return otp;
  }

  async verifyOtp(
    id: string,
    purpose: PurposeVerify,
    otp: string,
  ): Promise<{ userId: string; purpose: PurposeVerify } | null> {
    const storedOtp = await this.otpCache.get(id);
    if (storedOtp?.otp === otp && storedOtp?.purpose === purpose) {
      await this.otpCache.del(id);
      return { userId: storedOtp.userId, purpose: storedOtp.purpose };
    }
    return null;
  }

  async deleteOtp(id: string): Promise<void> {
    await this.otpCache.del(id);
  }

  async checkRateLimit(key: string): Promise<boolean> {
    const isRateLimited = await this.otpRateLimitCache.get(key);
    return isRateLimited === true;
  }

  async setRateLimit(key: string): Promise<void> {
    await this.otpRateLimitCache.set(key, true);
  }

  async getRegisterOtpLimit(userId: string): Promise<number | null> {
    return await this.registerOtpLimitCache.get(userId);
  }

  async incrementRegisterOtpLimit(userId: string): Promise<void> {
    const current = await this.registerOtpLimitCache.get(userId);
    const nextValue = current ? current + 1 : 1;
    await this.registerOtpLimitCache.set(userId, nextValue);
  }
}

export const otpRepository = new OtpRepository();
