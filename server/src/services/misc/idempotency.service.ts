import type { RedisClient } from 'bun';
import { IDEMPOTENCY_TTL } from 'src/share';

export type IdempotencyService = {
  checkAndSet: (key: string, ttl?: number) => Promise<boolean>;
  generateP2PKey: (
    orderId: string,
    action: string,
    idempotencyKey: string,
  ) => string;
  generateKey: (
    namespace: string,
    resourceId: string,
    action: string,
    idempotencyKey: string,
  ) => string;
  validateOperation: (
    namespace: string,
    resourceId: string,
    action: string,
    idempotencyKey: string,
    ttl?: number,
  ) => Promise<boolean>;
};

export const createIdempotencyService = (
  redis: RedisClient,
): IdempotencyService => {
  const checkAndSet = async (
    key: string,
    ttl: number = IDEMPOTENCY_TTL,
  ): Promise<boolean> => {
    try {
      const luaScript = `
        local key = KEYS[1]
        local ttl = tonumber(ARGV[1])
        local value = ARGV[2]

        if redis.call('EXISTS', key) == 1 then
          return 0
        end

        redis.call('SET', key, value, 'EX', ttl)
        return 1
      `;

      const result = await redis.send('EVAL', [
        luaScript,
        '1',
        key,
        ttl.toString(),
        '1',
      ]);

      return Number(result) === 1;
    } catch (error) {
      throw new Error(
        `Failed to check and set idempotency key ${key}: ${error}`,
      );
    }
  };

  const generateP2PKey = (
    orderId: string,
    action: string,
    idempotencyKey: string,
  ): string => {
    return `idemp:p2p:order:${orderId}:${action}:${idempotencyKey}`;
  };

  const generateKey = (
    namespace: string,
    resourceId: string,
    action: string,
    idempotencyKey: string,
  ): string => {
    return `idemp:${namespace}:${resourceId}:${action}:${idempotencyKey}`;
  };

  const validateOperation = (
    namespace: string,
    resourceId: string,
    action: string,
    idempotencyKey: string,
    ttl: number = IDEMPOTENCY_TTL,
  ): Promise<boolean> => {
    const key = generateKey(namespace, resourceId, action, idempotencyKey);
    return checkAndSet(key, ttl);
  };

  return {
    checkAndSet,
    generateP2PKey,
    generateKey,
    validateOperation,
  };
};
