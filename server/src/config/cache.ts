import { redis } from 'src/config/redis';
import type { Currency } from 'src/generated';
import { CACHE_NS, type ICurrentUser, type PurposeVerify } from 'src/share';
import superjson from 'superjson';

export class RedisCache<T> {
  constructor(
    private readonly config: {
      namespace: string;
      ttl?: number;
    },
  ) {}

  private key(key: string) {
    return `${this.config.namespace}:${key}`;
  }

  async set(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = superjson.stringify(value);
    const ttl = ttlSeconds ?? this.config.ttl;
    const cacheKey = this.key(key);

    if (ttl) {
      await redis.setex(cacheKey, ttl, data);
    } else {
      await redis.set(cacheKey, data);
    }
  }

  async get(key: string): Promise<T | null> {
    const data = await redis.get(this.key(key));
    return data ? (superjson.parse(data) as T) : null;
  }

  async getMany(keys: string[]): Promise<Map<string, T>> {
    if (keys.length === 0) {
      return new Map();
    }

    const redisKeys = keys.map((k) => this.key(k));
    const values = await redis.mget(...redisKeys);

    const result = new Map<string, T>();
    for (let i = 0; i < keys.length; i++) {
      const value = values[i];
      if (value) {
        result.set(keys[i] ?? '', superjson.parse(value) as T);
      }
    }

    return result;
  }

  async del(key: string): Promise<void> {
    await redis.del(this.key(key));
  }
}

const FIVE_MINUTES = 300;

export const currentUserCache = new RedisCache<ICurrentUser>({
  namespace: CACHE_NS.CURRENT_USER,
  ttl: FIVE_MINUTES,
});

export const settingCache = new RedisCache({
  namespace: CACHE_NS.SETTING,
  ttl: FIVE_MINUTES,
});
export type ISettingCache = typeof settingCache;

export const otpCache = new RedisCache<{
  otp: string;
  purpose: PurposeVerify;
  userId: string;
}>({
  namespace: CACHE_NS.OTP,
  ttl: FIVE_MINUTES,
});
export type IOTPCache = typeof otpCache;

export const mfaCache = new RedisCache<{ userId: string }>({
  namespace: CACHE_NS.MFA,
  ttl: FIVE_MINUTES,
});
export type IMFACache = typeof mfaCache;

export const otpRateLimitCache = new RedisCache<boolean>({
  namespace: CACHE_NS.OTP_RATE_LIMIT,
  ttl: 90,
});
export type IOtpRateLimitCache = typeof otpRateLimitCache;

export const mfaSetupCache = new RedisCache<{
  totpSecret: string;
  userId: string;
  sessionId: string;
}>({
  namespace: CACHE_NS.MFA_SETUP,
  ttl: FIVE_MINUTES,
});

export const registerOtpLimitCache = new RedisCache<number>({
  namespace: CACHE_NS.REGISTER_OTP_LIMIT,
});

export const registerRateLimitCache = new RedisCache<number>({
  namespace: CACHE_NS.REGISTER_RATE_LIMIT,
});
export type IRegisterRateLimitCache = typeof registerRateLimitCache;

export const captchaCache = new RedisCache<string>({
  namespace: 'captcha',
  ttl: FIVE_MINUTES,
});
export type ICaptchaCache = typeof captchaCache;

const ONE_DAY = 86400;

export const currencyByIdCache = new RedisCache<Currency>({
  namespace: CACHE_NS.CURRENCY,
  ttl: ONE_DAY,
});
export type ICurrencyByIdCache = typeof currencyByIdCache;

export const allCurrenciesCache = new RedisCache<Currency[]>({
  namespace: `${CACHE_NS.CURRENCY}:all`,
  ttl: ONE_DAY,
});
export type IAllCurrenciesCache = typeof allCurrenciesCache;
