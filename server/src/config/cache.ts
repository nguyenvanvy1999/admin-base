import { redis } from 'src/config/redis';
import type { RateLimitConfig } from 'src/generated';
import {
  CACHE_NS,
  type ICurrentUser,
  type PurposeVerify,
  type SecurityDeviceInsight,
} from 'src/share';
import type { AuthTx } from 'src/types/auth.types';
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

  async delMany(keys: string[]): Promise<void> {
    await redis.del(...keys.map((k) => this.key(k)));
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

export const rateLimitConfigCache = new RedisCache<RateLimitConfig>({
  namespace: CACHE_NS.RATE_LIMIT_CONFIG,
  ttl: FIVE_MINUTES,
});

export const otpCache = new RedisCache<{
  otp: string;
  purpose: PurposeVerify;
  userId: string;
}>({
  namespace: CACHE_NS.OTP,
  ttl: FIVE_MINUTES,
});
export type IOTPCache = typeof otpCache;

export const authTxCache = new RedisCache<AuthTx>({
  namespace: CACHE_NS.AUTH_TX,
  ttl: FIVE_MINUTES,
});
export type IAuthTxCache = typeof authTxCache;

export const mfaCache = new RedisCache<{
  userId: string;
  security?: SecurityDeviceInsight;
  loginToken: string;
  createdAt: number;
}>({
  namespace: CACHE_NS.MFA,
  ttl: FIVE_MINUTES,
});

export const otpRateLimitCache = new RedisCache<boolean>({
  namespace: CACHE_NS.OTP_RATE_LIMIT,
  ttl: 90,
});
export type IOtpRateLimitCache = typeof otpRateLimitCache;

export const mfaSetupCache = new RedisCache<{
  totpSecret: string;
  userId: string;
  sessionId: string;
  setupToken?: string;
  createdAt: number;
}>({
  namespace: CACHE_NS.MFA_SETUP,
  ttl: FIVE_MINUTES,
});

new RedisCache<{
  userId: string;
  clientIp: string;
  userAgent: string;
  createdAt: number;
  security?: SecurityDeviceInsight;
}>({
  namespace: CACHE_NS.MFA_SETUP_TOKEN,
  ttl: FIVE_MINUTES,
});

new RedisCache<string>({
  namespace: `${CACHE_NS.MFA_SETUP_TOKEN}:by-user`,
  ttl: FIVE_MINUTES,
});

export const registerOtpLimitCache = new RedisCache<number>({
  namespace: CACHE_NS.REGISTER_OTP_LIMIT,
});

export const rateLimitCache = new RedisCache<number>({
  namespace: CACHE_NS.RATE_LIMIT,
});

new RedisCache<number>({
  namespace: CACHE_NS.MFA_ATTEMPT,
  ttl: FIVE_MINUTES,
});

export const captchaCache = new RedisCache<string>({
  namespace: 'captcha',
  ttl: FIVE_MINUTES,
});
export type ICaptchaCache = typeof captchaCache;

export const userIpWhitelistCache = new RedisCache<string[]>({
  namespace: CACHE_NS.IP_WHITELIST,
  ttl: FIVE_MINUTES,
});
export type IUserIpWhitelistCache = typeof userIpWhitelistCache;

export const apiKeyCache = new RedisCache<any>({
  namespace: CACHE_NS.API_KEY,
  ttl: FIVE_MINUTES,
});
export type IApiKeyCache = typeof apiKeyCache;
