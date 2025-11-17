import type { ILogger } from '@server/configs/logger';
import { logger } from '@server/configs/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  constructor(
    private readonly deps: {
      logger?: ILogger;
      defaultTtl?: number;
    } = {
      logger,
      defaultTtl: 5 * 60 * 1000,
    },
  ) {}

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt =
      Date.now() + (ttl ?? this.deps.defaultTtl ?? 5 * 60 * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
