import { CACHE_NS, type ICurrentUser } from '@server/share';
import superjson from 'superjson';
import { redis } from './redis';

export class RedisCache<T> {
  constructor(
    private readonly config: {
      namespace: string;
      ttl?: number;
    },
  ) {}

  private key(key: string): string {
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
