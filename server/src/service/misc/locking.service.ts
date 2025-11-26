import type { RedisClient } from 'bun';
import { logger } from 'src/config/logger';
import { redis } from 'src/config/redis';

const RELEASE_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

export class LockingService {
  constructor(private readonly r: RedisClient = redis) {}

  async acquire(key: string, ttl: number = 10): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    const result = await this.r.send('SET', [
      lockKey,
      lockValue,
      'NX',
      'EX',
      String(ttl),
    ]);
    return result === 'OK' ? lockValue : null;
  }

  /**
   * Release lock safely (verify lockValue with a Lua script)
   */
  async release(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    try {
      const result = await this.r.send('EVAL', [
        RELEASE_LOCK_SCRIPT,
        '1',
        lockKey,
        lockValue,
      ]);
      return Number(result) === 1;
    } catch (error) {
      throw new Error(`Failed to release lock on ${key}: ${error}`);
    }
  }

  /**
   * Acquire with retry logic
   */
  async acquireWithRetry(
    key: string,
    ttl: number = 10,
    retryDelay: number = 100,
    maxRetries: number = 50,
  ): Promise<string> {
    let retries = 0;
    while (retries < maxRetries) {
      const lockValue = await this.acquire(key, ttl);
      if (lockValue) {
        return lockValue;
      }
      retries++;
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error(
      `Failed to acquire lock on ${key} after ${maxRetries} retries`,
    );
  }

  /**
   * Execute an action with a distributed lock
   */
  async lock<T>(
    key: string,
    action: () => Promise<T>,
    ttl: number = 10,
    retryDelay: number = 100,
    maxRetries: number = 50,
  ): Promise<T> {
    const lockValue = await this.acquireWithRetry(
      key,
      ttl,
      retryDelay,
      maxRetries,
    );

    try {
      return await action();
    } finally {
      try {
        await this.release(key, lockValue);
      } catch (releaseError) {
        logger.error(`Failed to release lock ${key}: ${releaseError}`);
      }
    }
  }
}

export const lockingService = new LockingService();
