import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import type { RedisClient } from 'bun';
import { logger } from 'src/config/logger';
import { LockingUtil } from 'src/services/shared/utils/locking.util';
import { LockFixtures } from 'test/fixtures';
import { TestLifecycle } from 'test/utils';
import type { RedisMock } from 'test/utils/mocks/redis';

describe('LockingUtil', () => {
  let redisSpies: RedisMock;
  let lockingService: LockingUtil;

  const mockSendFn = (cmd: string) =>
    cmd === 'SET' ? Promise.resolve('OK') : Promise.resolve(null);

  beforeAll(async () => {
    const { redis } = await import('src/config/redis');
    redisSpies = redis as unknown as RedisMock;
    TestLifecycle.clearMock();
  });

  beforeEach(() => {
    lockingService = new LockingUtil(redisSpies as unknown as RedisClient);
  });

  describe('acquire', () => {
    it('should acquire lock successfully when lock is available', async () => {
      // Arrange
      const lockData = LockFixtures.createLockData();
      const { key, ttl } = lockData;

      redisSpies.send.mockReset().mockImplementation(mockSendFn);

      // Act
      const result = await lockingService.acquire(key, ttl);

      // Assert
      expect(result).toMatch(/^\d{13}-0\.\d+$/); // timestamp-random format
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
      expect(redisSpies.send).toHaveBeenCalledWith('SET', [
        `lock:${key}`,
        expect.stringMatching(/^\d{13}-0\.\d+$/),
        'NX',
        'EX',
        String(ttl),
      ]);
    });

    it('should return null when lock is not available', async () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 5;

      redisSpies.send
        .mockReset()
        .mockImplementation(async (cmd: string) =>
          cmd === 'SET' ? null : null,
        );

      // Act
      const result = await lockingService.acquire(key, ttl);

      // Assert
      expect(result).toBeNull();
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
    });

    it('should use default TTL when not provided', async () => {
      // Arrange
      const key = 'test-resource';

      redisSpies.send.mockReset().mockImplementation(mockSendFn);

      // Act
      const result = await lockingService.acquire(key);

      // Assert
      expect(result).not.toBeNull();
      expect(redisSpies.send).toHaveBeenCalledWith('SET', [
        `lock:${key}`,
        expect.any(String),
        'NX',
        'EX',
        '10',
      ]);
    });

    it('should generate unique lock values for concurrent requests', async () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 10;

      redisSpies.send.mockReset().mockImplementation(mockSendFn);

      // Act
      const results = await Promise.all([
        lockingService.acquire(key + '1', ttl),
        lockingService.acquire(key + '2', ttl),
        lockingService.acquire(key + '3', ttl),
      ]);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result: string | null) => {
        expect(result).not.toBeNull();
      });

      // Verify all lock values are unique
      const lockValues = results as string[];
      const uniqueValues = new Set(lockValues);
      expect(uniqueValues.size).toBe(3);
    });

    it('should handle Redis errors gracefully', () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 10;
      const redisError = new Error('Redis connection failed');

      redisSpies.send
        .mockReset()
        .mockImplementation(() => Promise.reject(redisError));

      // Act & Assert
      expect(lockingService.acquire(key, ttl)).rejects.toThrow(
        'Redis connection failed',
      );
    });

    it('should prefix lock key correctly', async () => {
      // Arrange
      const key = 'my-resource-123';
      const ttl = 15;

      redisSpies.send.mockReset().mockImplementation(mockSendFn);

      // Act
      await lockingService.acquire(key, ttl);

      // Assert
      expect(redisSpies.send).toHaveBeenCalledWith('SET', [
        'lock:my-resource-123',
        expect.any(String),
        'NX',
        'EX',
        expect.any(String),
      ]);
    });
  });

  describe('release', () => {
    it('should release lock successfully when lock value matches', async () => {
      // Arrange
      const key = 'test-resource';
      const lockValue = '1234567890-0.123456789';

      redisSpies.send.mockReset().mockResolvedValueOnce(1);

      // Act
      const result = await lockingService.release(key, lockValue);

      // Assert
      expect(result).toBe(true);
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.stringContaining('if redis.call("GET", KEYS[1]) == ARGV[1]'),
        '1',
        `lock:${key}`,
        lockValue,
      ]);
    });

    it('should return false when lock value does not match', async () => {
      // Arrange
      const key = 'test-resource';
      const lockValue = '1234567890-0.123456789';

      redisSpies.send.mockReset().mockResolvedValueOnce(0);

      // Act
      const result = await lockingService.release(key, lockValue);

      // Assert
      expect(result).toBe(false);
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error when Redis eval fails', () => {
      // Arrange
      const key = 'test-resource';
      const lockValue = '1234567890-0.123456789';
      const evalError = new Error('Redis eval failed');

      redisSpies.send.mockReset().mockRejectedValueOnce(evalError);

      // Act & Assert
      expect(lockingService.release(key, lockValue)).rejects.toThrow(
        `Failed to release lock on ${key}: ${evalError}`,
      );
    });

    it('should use correct Lua script for atomic release', async () => {
      // Arrange
      const key = 'test-resource';
      const lockValue = '1234567890-0.123456789';

      redisSpies.send.mockReset().mockResolvedValueOnce(1);

      // Act
      await lockingService.release(key, lockValue);

      // Assert
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.stringContaining(
          'if redis.call("GET", KEYS[1]) == ARGV[1] then',
        ),
        '1',
        `lock:${key}`,
        lockValue,
      ]);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.stringContaining('return redis.call("DEL", KEYS[1])'),
        '1',
        `lock:${key}`,
        lockValue,
      ]);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.stringContaining('else'),
        '1',
        `lock:${key}`,
        lockValue,
      ]);
      expect(redisSpies.send).toHaveBeenCalledWith('EVAL', [
        expect.stringContaining('return 0'),
        '1',
        `lock:${key}`,
        lockValue,
      ]);
    });

    it('should handle numeric return values correctly', async () => {
      // Arrange
      const key = 'test-resource';
      const lockValue = '1234567890-0.123456789';

      // Test different numeric return values
      redisSpies.send.mockReset().mockResolvedValueOnce(1);
      const result1 = await lockingService.release(key, lockValue);
      expect(result1).toBe(true);

      redisSpies.send.mockReset().mockResolvedValueOnce(0);
      const result2 = await lockingService.release(key, lockValue);
      expect(result2).toBe(false);

      redisSpies.send.mockReset().mockResolvedValueOnce('1'); // String '1'
      const result3 = await lockingService.release(key, lockValue);
      expect(result3).toBe(true);
    });
  });

  describe('acquireWithRetry', () => {
    it('should acquire lock on first attempt', async () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 10;
      const retryDelay = 100;
      const maxRetries = 5;

      redisSpies.send.mockReset().mockImplementation(mockSendFn);

      // Act
      const result = await lockingService.acquireWithRetry(
        key,
        ttl,
        retryDelay,
        maxRetries,
      );

      // Assert
      expect(result).toMatch(/^\d{13}-0\.\d+$/);
      expect(redisSpies.send).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 10;
      const retryDelay = 50;
      const maxRetries = 3;

      redisSpies.send
        .mockReset()
        .mockImplementationOnce(async (cmd: string) =>
          cmd === 'SET' ? null : null,
        )
        .mockImplementationOnce(async (cmd: string) =>
          cmd === 'SET' ? null : null,
        )
        .mockImplementationOnce(mockSendFn);

      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = mock((callback: () => void) => {
        callback();
        return {};
      }) as any;

      try {
        // Act
        const result = await lockingService.acquireWithRetry(
          key,
          ttl,
          retryDelay,
          maxRetries,
        );

        // Assert
        expect(result).toMatch(/^\d{13}-0\.\d+$/);
        expect(redisSpies.send).toHaveBeenCalledTimes(3);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it('should throw error when max retries exceeded', () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 10;
      const retryDelay = 50;
      const maxRetries = 2;

      redisSpies.send
        .mockReset()
        .mockImplementation(async (cmd: string) =>
          cmd === 'SET' ? null : null,
        ); // Always fail

      // Mock setTimeout to avoid actual delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = mock((callback: () => void) => {
        callback();
        return {};
      }) as any;

      try {
        // Act & Assert
        expect(
          lockingService.acquireWithRetry(key, ttl, retryDelay, maxRetries),
        ).rejects.toThrow(
          `Failed to acquire lock on ${key} after ${maxRetries} retries`,
        );

        expect(redisSpies.send).toHaveBeenCalledTimes(maxRetries);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it('should use default parameters when not provided', async () => {
      // Arrange
      const key = 'test-resource';

      redisSpies.send.mockReset().mockImplementation(mockSendFn);

      // Act
      const result = await lockingService.acquireWithRetry(key);

      // Assert
      expect(result).not.toBeNull();
      expect(redisSpies.send).toHaveBeenCalledWith('SET', [
        `lock:${key}`,
        expect.any(String),
        'NX',
        'EX',
        '10',
      ]);
    });

    it('should handle Redis errors during retries', () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 10;
      const retryDelay = 50;
      const maxRetries = 2;
      const redisError = new Error('Redis connection lost');

      redisSpies.send
        .mockReset()
        .mockImplementationOnce(async (cmd: string) =>
          cmd === 'SET' ? null : null,
        ) // First attempt fails
        .mockImplementationOnce(() => Promise.reject(redisError)); // Second attempt throws error

      // Mock setTimeout
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = mock((callback: () => void) => {
        callback();
        return {};
      }) as any;

      try {
        // Act & Assert
        expect(
          lockingService.acquireWithRetry(key, ttl, retryDelay, maxRetries),
        ).rejects.toThrow('Redis connection lost');
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('lock', () => {
    it('should execute action successfully with lock', async () => {
      // Arrange
      const key = 'test-resource';
      const expectedResult = 'action-result';
      const action = mock(() => Promise.resolve(expectedResult));

      redisSpies.send.mockReset().mockImplementationOnce(mockSendFn);
      redisSpies.send.mockImplementationOnce(async () => 1);

      // Act
      const result = await lockingService.lock(key, action);

      // Assert
      expect(result).toBe(expectedResult);
      expect(action).toHaveBeenCalledTimes(1);
      expect(redisSpies.send).toHaveBeenCalledWith('SET', expect.any(Array)); // acquire
      expect(redisSpies.send).toHaveBeenCalledTimes(2); // SET + EVAL
    });

    it('should release lock even if action throws error', () => {
      // Arrange
      const key = 'test-resource';
      const actionError = new Error('Action failed');
      const action = mock(() => Promise.reject(actionError));

      redisSpies.send.mockReset().mockImplementationOnce(mockSendFn);
      redisSpies.send.mockImplementationOnce(async () => 1);

      // Act & Assert
      expect(lockingService.lock(key, action)).rejects.toThrow('Action failed');

      expect(action).toHaveBeenCalledTimes(1);
      expect(redisSpies.send).toHaveBeenCalledWith('SET', expect.any(Array)); // acquire
      expect(redisSpies.send).toHaveBeenCalledTimes(2); // SET + EVAL
    });

    it('should log error when lock release fails but not throw', async () => {
      // Arrange
      const errorSpy = spyOn(logger, 'error');
      const key = 'test-resource';
      const expectedResult = 'action-result';
      const action = mock(() => Promise.resolve(expectedResult));
      const releaseError = new Error('Failed to release lock');

      redisSpies.send
        .mockReset()
        .mockImplementationOnce(mockSendFn)
        .mockRejectedValueOnce(releaseError);

      // Act
      const result = await lockingService.lock(key, action);

      // Assert
      expect(result).toBe(expectedResult); // Action result should still be returned
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to release lock ${key}:`),
      );
    });

    it('should handle action that returns different types', async () => {
      // Arrange
      const key = 'test-resource';

      redisSpies.send
        .mockClear()
        .mockImplementation(async (cmd: string) => (cmd === 'SET' ? 'OK' : 1));

      // Test with object return
      const objectAction = mock(() => Promise.resolve({ data: 'test' }));
      const objectResult = await lockingService.lock(key, objectAction);
      expect(objectResult).toEqual({ data: 'test' });

      // Test with number return
      const numberAction = mock(() => Promise.resolve(42));
      const numberResult = await lockingService.lock(key + '2', numberAction);
      expect(numberResult).toBe(42);

      // Test with boolean return
      const booleanAction = mock(() => Promise.resolve(true));
      const booleanResult = await lockingService.lock(key + '3', booleanAction);
      expect(booleanResult).toBe(true);

      // Test with undefined return
      const undefinedAction = mock(() => Promise.resolve(undefined));
      const undefinedResult = await lockingService.lock(
        key + '4',
        undefinedAction,
      );
      expect(undefinedResult).toBeUndefined();
    });

    it('should use provided parameters for lock acquisition', async () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 30;
      const retryDelay = 200;
      const maxRetries = 10;
      const action = mock(() => Promise.resolve('result'));

      redisSpies.send
        .mockReset()
        .mockImplementationOnce(mockSendFn)
        .mockImplementationOnce(async () => 1);
      redisSpies.send
        .mockReset()
        .mockImplementationOnce(mockSendFn)
        .mockImplementationOnce(async () => 1);

      // Act
      await lockingService.lock(key, action, ttl, retryDelay, maxRetries);

      // Assert
      expect(redisSpies.send).toHaveBeenCalledWith('SET', [
        `lock:${key}`,
        expect.any(String),
        'NX',
        'EX',
        String(ttl),
      ]);
    });

    it('should fail when lock acquisition fails', () => {
      // Arrange
      const key = 'test-resource';
      const ttl = 5;
      const retryDelay = 50;
      const maxRetries = 2;
      const action = mock(() => Promise.resolve('result'));

      redisSpies.send
        .mockReset()
        .mockImplementation(async (cmd: string) =>
          cmd === 'SET' ? null : null,
        ); // Always fail to acquire

      // Mock setTimeout
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = mock((callback: () => void) => {
        callback();
        return {};
      }) as any;

      try {
        // Act & Assert
        expect(
          lockingService.lock(key, action, ttl, retryDelay, maxRetries),
        ).rejects.toThrow(
          `Failed to acquire lock on ${key} after ${maxRetries} retries`,
        );

        expect(action).not.toHaveBeenCalled();
        expect(redisSpies.send).toHaveBeenCalledTimes(maxRetries); // Only SET attempts, no EVAL
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete lock lifecycle', async () => {
      // Arrange
      const key = 'integration-test';
      const ttl = 15;
      let lockValue!: string;

      // Combined mock for SET and EVAL to avoid clearing between steps
      redisSpies.send
        .mockClear()
        .mockImplementation((cmd: string, args: any[] = []) => {
          if (cmd === 'SET') {
            const [lockKey, value, nx, ex, exVal] = args;
            if (
              lockKey === `lock:${key}` &&
              nx === 'NX' &&
              ex === 'EX' &&
              Number(exVal) === ttl
            ) {
              lockValue = value;
              return Promise.resolve('OK');
            }
            return Promise.resolve(null);
          }
          if (cmd === 'EVAL') {
            const [_script, _numKeys, providedKey, providedValue] = args;
            if (providedKey === `lock:${key}` && providedValue === lockValue) {
              return Promise.resolve(1);
            }
            return Promise.resolve(0);
          }
          return Promise.resolve(null);
        });

      // Act - Acquire
      const acquiredValue = await lockingService.acquire(key, ttl);

      // Assert - Acquire
      expect(acquiredValue).not.toBeNull();
      expect(acquiredValue).toBe(lockValue);

      // Act - Release
      const released = await lockingService.release(
        key,
        acquiredValue as string,
      );

      // Assert - Release
      expect(released).toBe(true);
    });

    it('should handle concurrent lock attempts correctly', async () => {
      // Arrange
      const key = 'concurrent-test';
      const ttl = 10;
      let lockAcquired = false;

      // Mock: only first request succeeds
      redisSpies.send.mockClear().mockImplementation((cmd: string) => {
        if (cmd !== 'SET') return Promise.resolve(null);
        if (!lockAcquired) {
          lockAcquired = true;
          return Promise.resolve('OK');
        }
        return Promise.resolve(null);
      });

      // Act
      const results = await Promise.all([
        lockingService.acquire(key, ttl),
        lockingService.acquire(key, ttl),
        lockingService.acquire(key, ttl),
      ]);

      // Assert
      const successfulAcquisitions = results.filter(
        (result: string | null) => result !== null,
      );
      expect(successfulAcquisitions).toHaveLength(1);
      expect(
        results.filter((result: string | null) => result === null),
      ).toHaveLength(2);
    });

    it('should handle full lock action workflow with retries', async () => {
      // Arrange
      const key = 'workflow-test';
      const ttl = 20;
      const retryDelay = 10;
      const maxRetries = 3;
      const expectedResult = { success: true, data: 'processed' };
      const action = mock(() => Promise.resolve(expectedResult));

      // Mock: fail first two attempts, succeed on third
      redisSpies.send
        .mockClear()
        .mockImplementationOnce((cmd: string) =>
          cmd === 'SET' ? Promise.resolve(null) : Promise.resolve(null),
        )
        .mockImplementationOnce((cmd: string) =>
          cmd === 'SET' ? Promise.resolve(null) : Promise.resolve(null),
        )
        .mockImplementationOnce((cmd: string) =>
          cmd === 'SET' ? Promise.resolve('OK') : Promise.resolve(null),
        );

      redisSpies.send.mockClear().mockResolvedValueOnce(1); // Release succeeds

      // Mock setTimeout for retries
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = mock((callback: () => void) => {
        callback();
        return {};
      }) as any;

      try {
        // Act
        const result = await lockingService.lock(
          key,
          action,
          ttl,
          retryDelay,
          maxRetries,
        );

        // Assert
        expect(result).toEqual(expectedResult);
        expect(action).toHaveBeenCalledTimes(1);
        expect(redisSpies.send).toHaveBeenCalledTimes(4); // 3 SET + 1 EVAL
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it('should maintain lock isolation between different keys', async () => {
      // Arrange
      const key1 = 'resource-1';
      const key2 = 'resource-2';
      const ttl = 10;
      const locks = new Map<string, string>();

      // Combined mock for SET and EVAL to maintain isolation per key
      redisSpies.send
        .mockClear()
        .mockImplementation((cmd: string, args: any[] = []) => {
          if (cmd === 'SET') {
            const [lockKey, value] = args;
            if (!locks.has(lockKey)) {
              locks.set(lockKey, value);
              return Promise.resolve('OK');
            }
            return Promise.resolve(null);
          }
          if (cmd === 'EVAL') {
            const [_script, _numKeys, lockKey, lockValue] = args;
            if (locks.get(lockKey) === lockValue) {
              locks.delete(lockKey);
              return Promise.resolve(1);
            }
            return Promise.resolve(0);
          }
          return Promise.resolve(null);
        });

      // Act
      const lock1 = await lockingService.acquire(key1, ttl);
      const lock2 = await lockingService.acquire(key2, ttl);

      // Assert
      expect(lock1).not.toBeNull();
      expect(lock2).not.toBeNull();
      expect(lock1).not.toBe(lock2);
      expect(locks.size).toBe(2);

      // Act - Release locks
      const release1 = await lockingService.release(key1, lock1 as string);
      const release2 = await lockingService.release(key2, lock2 as string);

      // Assert
      expect(release1).toBe(true);
      expect(release2).toBe(true);
      expect(locks.size).toBe(0);
    });
  });
});
