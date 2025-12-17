import type { RedisClient } from 'bun';
import type { ILogger } from 'src/config/logger';

const RELEASE_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

export type LockingService = {
  acquire: (key: string, ttl?: number) => Promise<string | null>;
  release: (key: string, lockValue: string) => Promise<boolean>;
  acquireWithRetry: (
    key: string,
    ttl?: number,
    retryDelay?: number,
    maxRetries?: number,
  ) => Promise<string>;
  lock: <T>(
    key: string,
    action: () => Promise<T>,
    ttl?: number,
    retryDelay?: number,
    maxRetries?: number,
  ) => Promise<T>;
};

export const createLockingService = (
  redis: RedisClient,
  logger: ILogger,
): LockingService => {
  const acquire = async (
    key: string,
    ttl: number = 10,
  ): Promise<string | null> => {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    const result = await redis.send('SET', [
      lockKey,
      lockValue,
      'NX',
      'EX',
      String(ttl),
    ]);
    return result === 'OK' ? lockValue : null;
  };

  const release = async (key: string, lockValue: string): Promise<boolean> => {
    const lockKey = `lock:${key}`;
    try {
      const result = await redis.send('EVAL', [
        RELEASE_LOCK_SCRIPT,
        '1',
        lockKey,
        lockValue,
      ]);
      return Number(result) === 1;
    } catch (error) {
      throw new Error(`Failed to release lock on ${key}: ${error}`);
    }
  };

  const acquireWithRetry = async (
    key: string,
    ttl: number = 10,
    retryDelay: number = 100,
    maxRetries: number = 50,
  ): Promise<string> => {
    let retries = 0;
    while (retries < maxRetries) {
      const lockValue = await acquire(key, ttl);
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
  };

  const lock = async <T>(
    key: string,
    action: () => Promise<T>,
    ttl: number = 10,
    retryDelay: number = 100,
    maxRetries: number = 50,
  ): Promise<T> => {
    const lockValue = await acquireWithRetry(key, ttl, retryDelay, maxRetries);

    try {
      return await action();
    } finally {
      try {
        await release(key, lockValue);
      } catch (releaseError) {
        logger.error(`Failed to release lock ${key}: ${releaseError}`);
      }
    }
  };

  return {
    acquire,
    release,
    acquireWithRetry,
    lock,
  };
};
