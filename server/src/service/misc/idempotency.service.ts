import type { RedisClient } from 'bun';
import { redis } from 'src/config/redis';
import { IDEMPOTENCY_TTL } from 'src/share';

export class IdempotencyService {
  constructor(private readonly r: RedisClient = redis) {}

  async checkAndSet(
    key: string,
    ttl: number = IDEMPOTENCY_TTL,
  ): Promise<boolean> {
    try {
      const luaScript = `
        local key = KEYS[1]
        local ttl = tonumber(ARGV[1])
        local value = ARGV[2]

        if redis.call('EXISTS', key) == 1 then
          return 0
        end

        redis.call('SET', key, value, 'EX', ttl)
        return 1  -- Key was set successfully
      `;

      const result = await this.r.send('EVAL', [
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
  }

  generateP2PKey(
    orderId: string,
    action: string,
    idempotencyKey: string,
  ): string {
    return `idemp:p2p:order:${orderId}:${action}:${idempotencyKey}`;
  }

  generateKey(
    namespace: string,
    resourceId: string,
    action: string,
    idempotencyKey: string,
  ): string {
    return `idemp:${namespace}:${resourceId}:${action}:${idempotencyKey}`;
  }

  validateP2POperation(
    orderId: string,
    action: string,
    idempotencyKey: string,
    ttl: number = IDEMPOTENCY_TTL,
  ): Promise<boolean> {
    const key = this.generateP2PKey(orderId, action, idempotencyKey);
    return this.checkAndSet(key, ttl);
  }

  validateOperation(
    namespace: string,
    resourceId: string,
    action: string,
    idempotencyKey: string,
    ttl: number = IDEMPOTENCY_TTL,
  ): Promise<boolean> {
    const key = this.generateKey(namespace, resourceId, action, idempotencyKey);
    return this.checkAndSet(key, ttl);
  }
}

export const idempotencyService = new IdempotencyService();
