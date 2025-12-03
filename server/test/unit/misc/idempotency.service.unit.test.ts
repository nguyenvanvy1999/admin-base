import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { RedisClient } from 'bun';
import { IdempotencyService } from 'src/service/misc/idempotency.service';
import { IDEMPOTENCY_TTL } from 'src/share';
import { IdempotencyFixtures } from 'test/fixtures';
import type { RedisMock } from 'test/utils/mocks/redis';

describe('IdempotencyService', () => {
  let redisSpies: RedisMock;
  let idempotencyService: IdempotencyService;

  beforeAll(async () => {
    const { redis } = await import('src/config/redis');
    redisSpies = redis as unknown as RedisMock;
  });

  beforeEach(() => {
    idempotencyService = new IdempotencyService(
      redisSpies as unknown as RedisClient,
    );
    redisSpies.send.mockReset();
  });

  describe('checkAndSet', () => {
    it('should return true when key is successfully set (key does not exist)', async () => {
      // Arrange
      const idempotencyData = IdempotencyFixtures.createIdempotencyData();
      const { key, ttl } = idempotencyData;
      redisSpies.send.mockResolvedValue(1 as unknown as never); // Success case

      // Act
      const result = await idempotencyService.checkAndSet(key, ttl);

      // Assert
      expect(result).toBe(true);
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.stringContaining("if redis.call('EXISTS', key) == 1 then"),
        '1',
        key,
        ttl.toString(),
        '1',
      ]);
    });

    it('should return false when key already exists', async () => {
      // Arrange
      const key = 'existing-key';
      const ttl = 3600;
      redisSpies.send.mockResolvedValue(0 as unknown as never); // Key already exists

      // Act
      const result = await idempotencyService.checkAndSet(key, ttl);

      // Assert
      expect(result).toBe(false);
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
    });

    it('should use default TTL when not provided', async () => {
      // Arrange
      const key = 'test-key';
      redisSpies.send.mockResolvedValue(1 as unknown as never);

      // Act
      const result = await idempotencyService.checkAndSet(key);

      // Assert
      expect(result).toBe(true);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.any(String),
        '1',
        key,
        IDEMPOTENCY_TTL.toString(),
        '1',
      ]);
    });

    it('should throw error when redis eval fails', () => {
      // Arrange
      const key = 'test-key';
      const ttl = 3600;
      const redisError = new Error('Redis connection failed');
      redisSpies.send.mockRejectedValue(redisError);

      // Act & Assert
      expect(idempotencyService.checkAndSet(key, ttl)).rejects.toThrow(
        `Failed to check and set idempotency key ${key}: ${redisError}`,
      );
    });

    it('should handle non-numeric redis response correctly', async () => {
      // Arrange
      const key = 'test-key';
      const ttl = 3600;
      redisSpies.send.mockResolvedValue(
        'unexpected-response' as unknown as never,
      );

      // Act
      const result = await idempotencyService.checkAndSet(key, ttl);

      // Assert
      expect(result).toBe(false); // Number('unexpected-response') is NaN, which !== 1
    });
  });

  describe('generateP2PKey', () => {
    it('should generate correct P2P key format', () => {
      // Arrange
      const orderId = 'order-123';
      const action = 'confirm';
      const idempotencyKey = 'idemp-456';

      // Act
      const key = idempotencyService.generateP2PKey(
        orderId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(key).toBe('idemp:p2p:order:order-123:confirm:idemp-456');
    });

    it('should handle special characters in parameters', () => {
      // Arrange
      const orderId = 'order-123:special';
      const action = 'confirm-payment';
      const idempotencyKey = 'idemp:456:test';

      // Act
      const key = idempotencyService.generateP2PKey(
        orderId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(key).toBe(
        'idemp:p2p:order:order-123:special:confirm-payment:idemp:456:test',
      );
    });
  });

  describe('generateKey', () => {
    it('should generate correct generic key format', () => {
      // Arrange
      const namespace = 'payment';
      const resourceId = 'txn-789';
      const action = 'process';
      const idempotencyKey = 'idemp-123';

      // Act
      const key = idempotencyService.generateKey(
        namespace,
        resourceId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(key).toBe('idemp:payment:txn-789:process:idemp-123');
    });

    it('should handle empty strings in parameters', () => {
      // Arrange
      const namespace = '';
      const resourceId = 'resource-123';
      const action = '';
      const idempotencyKey = 'idemp-123';

      // Act
      const key = idempotencyService.generateKey(
        namespace,
        resourceId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(key).toBe('idemp::resource-123::idemp-123');
    });
  });

  describe('validateP2POperation', () => {
    it('should return true for valid P2P operation', async () => {
      // Arrange
      const orderId = 'order-123';
      const action = 'confirm';
      const idempotencyKey = 'idemp-456';
      const ttl = 7200;
      redisSpies.send.mockResolvedValue(1 as unknown as never);

      // Act
      const result = await idempotencyService.validateP2POperation(
        orderId,
        action,
        idempotencyKey,
        ttl,
      );

      // Assert
      expect(result).toBe(true);
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.any(String),
        '1',
        'idemp:p2p:order:order-123:confirm:idemp-456',
        ttl.toString(),
        '1',
      ]);
    });

    it('should return false when P2P operation is duplicate', async () => {
      // Arrange
      const orderId = 'order-123';
      const action = 'confirm';
      const idempotencyKey = 'idemp-456';
      redisSpies.send.mockResolvedValue(0 as unknown as never);

      // Act
      const result = await idempotencyService.validateP2POperation(
        orderId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should use default TTL when not provided in validateP2POperation', async () => {
      // Arrange
      const orderId = 'order-123';
      const action = 'confirm';
      const idempotencyKey = 'idemp-456';
      redisSpies.send.mockResolvedValue(1 as unknown as never);

      // Act
      await idempotencyService.validateP2POperation(
        orderId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.any(String),
        '1',
        'idemp:p2p:order:order-123:confirm:idemp-456',
        IDEMPOTENCY_TTL.toString(),
        '1',
      ]);
    });

    it('should throw error when validateP2POperation fails', () => {
      // Arrange
      const orderId = 'order-123';
      const action = 'confirm';
      const idempotencyKey = 'idemp-456';
      const redisError = new Error('Redis error');
      redisSpies.send.mockRejectedValue(redisError);

      // Act & Assert
      expect(
        idempotencyService.validateP2POperation(
          orderId,
          action,
          idempotencyKey,
        ),
      ).rejects.toThrow(
        `Failed to check and set idempotency key idemp:p2p:order:${orderId}:${action}:${idempotencyKey}: ${redisError}`,
      );
    });
  });

  describe('validateOperation', () => {
    it('should return true for valid generic operation', async () => {
      // Arrange
      const namespace = 'payment';
      const resourceId = 'txn-789';
      const action = 'process';
      const idempotencyKey = 'idemp-123';
      const ttl = 1800;
      redisSpies.send.mockResolvedValue(1);

      // Act
      const result = await idempotencyService.validateOperation(
        namespace,
        resourceId,
        action,
        idempotencyKey,
        ttl,
      );

      // Assert
      expect(result).toBe(true);
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.any(String),
        '1',
        'idemp:payment:txn-789:process:idemp-123',
        ttl.toString(),
        '1',
      ]);
    });

    it('should return false when generic operation is duplicate', async () => {
      // Arrange
      const namespace = 'payment';
      const resourceId = 'txn-789';
      const action = 'process';
      const idempotencyKey = 'idemp-123';
      redisSpies.send.mockResolvedValue(0);

      // Act
      const result = await idempotencyService.validateOperation(
        namespace,
        resourceId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should use default TTL when not provided in validateOperation', async () => {
      // Arrange
      const namespace = 'payment';
      const resourceId = 'txn-789';
      const action = 'process';
      const idempotencyKey = 'idemp-123';
      redisSpies.send.mockResolvedValue(1);

      // Act
      await idempotencyService.validateOperation(
        namespace,
        resourceId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.any(String),
        '1',
        'idemp:payment:txn-789:process:idemp-123',
        IDEMPOTENCY_TTL.toString(),
        '1',
      ]);
    });

    it('should throw error when validateOperation fails', () => {
      // Arrange
      const namespace = 'payment';
      const resourceId = 'txn-789';
      const action = 'process';
      const idempotencyKey = 'idemp-123';
      const redisError = new Error('Database connection lost');
      redisSpies.send.mockRejectedValue(redisError);

      // Act & Assert
      expect(
        idempotencyService.validateOperation(
          namespace,
          resourceId,
          action,
          idempotencyKey,
        ),
      ).rejects.toThrow(
        `Failed to check and set idempotency key idemp:${namespace}:${resourceId}:${action}:${idempotencyKey}: ${redisError}`,
      );
    });
  });

  describe('Edge cases and integration tests', () => {
    it('should handle very long parameters in key generation', () => {
      // Arrange
      const longString = 'a'.repeat(1000);
      const orderId = longString;
      const action = 'confirm';
      // Act
      const key = idempotencyService.generateP2PKey(
        orderId,
        action,
        longString,
      );

      // Assert
      expect(key).toStartWith('idemp:p2p:order:');
      expect(key).toContain(longString);
      expect(key.length).toBeGreaterThan(2000);
    });

    it('should handle unicode characters in key generation', () => {
      // Arrange
      const orderId = 'order-🎯-test';
      const action = 'confirm-✅';
      const idempotencyKey = 'idemp-🔑-456';

      // Act
      const key = idempotencyService.generateP2PKey(
        orderId,
        action,
        idempotencyKey,
      );

      // Assert
      expect(key).toBe('idemp:p2p:order:order-🎯-test:confirm-✅:idemp-🔑-456');
    });

    it('should handle zero TTL in checkAndSet', async () => {
      // Arrange
      const key = 'test-key';
      const ttl = 0;
      redisSpies.send.mockResolvedValue(1);

      // Act
      const result = await idempotencyService.checkAndSet(key, ttl);

      // Assert
      expect(result).toBe(true);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.any(String),
        '1',
        key,
        '0',
        '1',
      ]);
    });

    it('should handle negative TTL in checkAndSet', async () => {
      // Arrange
      const key = 'test-key';
      const ttl = -100;
      redisSpies.send.mockResolvedValue(1);

      // Act
      const result = await idempotencyService.checkAndSet(key, ttl);

      // Assert
      expect(result).toBe(true);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.any(String),
        '1',
        key,
        '-100',
        '1',
      ]);
    });
  });

  describe('Lua script validation', () => {
    it('should call redis eval with correct Lua script structure', async () => {
      // Arrange
      const key = 'test-key';
      const ttl = 3600;
      redisSpies.send.mockResolvedValue(1);

      // Act
      await idempotencyService.checkAndSet(key, ttl);

      // Assert - Verify all script parts are present
      const [command, args] = redisSpies.send.mock.calls[0] as any[];
      expect(command).toBe('EVAL');
      expect(args).toBeArray();
      expect(args.length).toBe(5);

      const script = args[0];
      expect(script).toContain('local key = KEYS[1]');
      expect(script).toContain('local ttl = tonumber(ARGV[1])');
      expect(script).toContain('local value = ARGV[2]');
      expect(script).toContain("redis.call('EXISTS', key)");
      expect(script).toContain("redis.call('SET', key, value, 'EX', ttl)");
      expect(script).toContain('return 0');
      expect(script).toContain('return 1');

      expect(args[1]).toBe('1'); // number of keys
      expect(args[2]).toBe(key);
      expect(args[3]).toBe(ttl.toString());
      expect(args[4]).toBe('1'); // value
    });
  });
});
