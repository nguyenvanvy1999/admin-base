import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
} from 'bun:test';
import type { RedisCache } from 'src/config/cache';
import { CACHE_NS } from 'src/share';
import { TestLifecycle } from 'test/utils';
import type { RedisMock } from 'test/utils/mocks/redis';

const TEST_NS = 'test-ns';

let redisSpies: RedisMock;

describe('RedisCache', () => {
  beforeEach(async () => {
    const { redis } = await import('src/config/redis');
    redisSpies = redis as unknown as RedisMock;
    redisSpies.set.mockResolvedValue('OK');
    redisSpies.setex.mockResolvedValue('OK');
    redisSpies.get.mockResolvedValue(null);
    redisSpies.del.mockResolvedValue(1);
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  it('should set without ttl when neither default nor override provided', async () => {
    const { RedisCache } = await import('src/config/cache');
    const cache = new RedisCache<{ a: number }>({ namespace: TEST_NS });

    await cache.set('k', { a: 1 });

    expect(redisSpies.set).toHaveBeenCalledTimes(1);
    expect(redisSpies.set).toHaveBeenCalledWith(
      `${TEST_NS}:k`,
      expect.any(String),
    );

    expectTypeOf(cache).toBeObject();
    expectTypeOf(cache.set).toBeFunction();
    expectTypeOf(cache.get).toBeFunction();
    expectTypeOf(cache.del).toBeFunction();
  });

  it('should set with default ttl when configured', async () => {
    const { RedisCache } = await import('src/config/cache');
    const cache = new RedisCache<{ a: number }>({
      namespace: TEST_NS,
      ttl: 10,
    });

    await cache.set('k', { a: 2 });

    expect(redisSpies.setex).toHaveBeenCalledWith(
      `${TEST_NS}:k`,
      10,
      expect.any(String),
    );
  });

  it('should set with override ttl when provided', async () => {
    const { RedisCache } = await import('src/config/cache');
    const cache = new RedisCache<{ a: number }>({
      namespace: TEST_NS,
      ttl: 10,
    });

    await cache.set('k', { a: 3 }, 5);

    expect(redisSpies.setex).toHaveBeenCalledWith(
      `${TEST_NS}:k`,
      5,
      expect.any(String),
    );
  });

  it('should get and deserialize value', async () => {
    const { RedisCache } = await import('src/config/cache');
    const { default: superjson } = await import('superjson');
    redisSpies.get.mockResolvedValueOnce(superjson.stringify({ a: 9 }));

    const cache = new RedisCache<{ a: number }>({ namespace: TEST_NS });
    const value = await cache.get('k');
    expect(value).toEqual({ a: 9 });
    expect(redisSpies.get).toHaveBeenCalledWith(`${TEST_NS}:k`);

    expectTypeOf(value).toEqualTypeOf<{ a: number } | null>();
  });

  it('should return null when cache miss', async () => {
    const { RedisCache } = await import('src/config/cache');
    redisSpies.get.mockResolvedValueOnce(null);
    const value = await new RedisCache<{ a: number }>({
      namespace: TEST_NS,
    }).get('missing');
    expect(value).toBeNull();
    expect(redisSpies.get).toHaveBeenCalledWith(`${TEST_NS}:missing`);
  });

  it('should delete key with namespacing', async () => {
    const { RedisCache } = await import('src/config/cache');
    const cache = new RedisCache<{ a: number }>({ namespace: TEST_NS });
    await cache.del('k');
    expect(redisSpies.del).toHaveBeenCalledWith(`${TEST_NS}:k`);
  });

  it('should expose predefined caches', async () => {
    const mod = await import('src/config/cache');
    expect(mod.currentUserCache).toBeDefined();
    expect(mod.settingCache).toBeDefined();
    expect(mod.otpCache).toBeDefined();
    expect(mod.mfaCache).toBeDefined();
    expect(mod.otpRateLimitCache).toBeDefined();
    expect(mod.mfaSetupCache).toBeDefined();
    expect(mod.registerOtpLimitCache).toBeDefined();
    expect(mod.captchaCache).toBeDefined();
  });

  it('should use namespace and ttl for currentUserCache (300s)', async () => {
    const mod = await import('src/config/cache');
    await mod.currentUserCache.set('key', { id: 'u1' } as any);
    expect(redisSpies.setex).toHaveBeenCalledWith(
      `${CACHE_NS.CURRENT_USER}:key`,
      300,
      expect.any(String),
    );
  });

  it('should apply ttl=90 for otpRateLimitCache', async () => {
    const mod = await import('src/config/cache');
    await mod.otpRateLimitCache.set('u1', true);
    expect(redisSpies.setex).toHaveBeenCalledWith(
      `${CACHE_NS.OTP_RATE_LIMIT}:u1`,
      90,
      expect.any(String),
    );
  });

  it('should set without ttl for registerOtpLimitCache', async () => {
    const mod = await import('src/config/cache');
    await mod.registerOtpLimitCache.set('email', 2);
    expect(redisSpies.set).toHaveBeenCalledWith(
      `${CACHE_NS.REGISTER_OTP_LIMIT}:email`,
      expect.any(String),
    );
  });

  describe('Enhanced Testing with Bun 1.3 Features', () => {
    it.each([
      { key: 'test1', value: { id: 1 }, ttl: 60 },
      { key: 'test2', value: { id: 2 }, ttl: 120 },
      { key: 'test3', value: { id: 3 }, ttl: 300 },
    ])('should handle different TTL values for key %key', async ({
      key,
      value,
      ttl,
    }) => {
      const { RedisCache } = await import('src/config/cache');
      const cache = new RedisCache<{ id: number }>({
        namespace: TEST_NS,
        ttl,
      });

      await cache.set(key, value);

      expect(redisSpies.setex).toHaveBeenCalledWith(
        `${TEST_NS}:${key}`,
        ttl,
        expect.any(String),
      );
    });

    it('should handle null values in cache operations', async () => {
      const { RedisCache } = await import('src/config/cache');
      const cache = new RedisCache<{ invalid: string | null }>({
        namespace: TEST_NS,
      });

      await cache.set('invalid', { invalid: null });
      expect(redisSpies.set).toHaveBeenCalledWith(
        `${TEST_NS}:invalid`,
        expect.any(String),
      );
    });

    it('performance test for large data', async () => {
      const { RedisCache } = await import('src/config/cache');
      const cache = new RedisCache<{ data: number[] }>({ namespace: TEST_NS });

      const largeData = { data: Array.from({ length: 10000 }, (_, i) => i) };
      await cache.set('large', largeData);

      expect(redisSpies.set).toHaveBeenCalledTimes(1);
    });

    it('should test mock return values with new matchers', async () => {
      const { RedisCache } = await import('src/config/cache');
      const cache = new RedisCache<{ test: string }>({ namespace: TEST_NS });

      // Mock multiple return values
      redisSpies.get
        .mockResolvedValueOnce('{"test":"first"}' as unknown as null)
        .mockResolvedValueOnce('{"test":"second"}' as unknown as null)
        .mockResolvedValueOnce('{"test":"third"}' as unknown as null);

      await cache.get('key1');
      await cache.get('key2');
      await cache.get('key3');

      expect(redisSpies.get).toHaveBeenCalledTimes(3);
    });

    it('should test type safety with expectTypeOf', async () => {
      const { RedisCache } = await import('src/config/cache');

      // Test generic type inference
      interface UserData {
        id: number;
        name: string;
        email: string;
      }

      const userCache = new RedisCache<UserData>({ namespace: TEST_NS });

      expectTypeOf(userCache).toEqualTypeOf<RedisCache<UserData>>();
      expectTypeOf(userCache.set).parameters.toEqualTypeOf<
        [string, UserData, number?]
      >();
      expectTypeOf(userCache.get).returns.toEqualTypeOf<
        Promise<UserData | null>
      >();

      // Test with actual data
      const userData: UserData = {
        id: 1,
        name: 'John',
        email: 'john@test.com',
      };
      expectTypeOf(userData).toEqualTypeOf<UserData>();
    });

    it.each([
      { key: 'valid1', value: { valid: true } },
      { key: 'valid2', value: { valid: false } },
      { key: 'valid3', value: { valid: null } },
    ])('should handle valid data %key', async ({ key, value }) => {
      const { RedisCache } = await import('src/config/cache');
      const cache = new RedisCache<{ valid: boolean | null }>({
        namespace: TEST_NS,
      });

      await cache.set(key, value);
      expect(redisSpies.set).toHaveBeenCalledWith(
        `${TEST_NS}:${key}`,
        expect.any(String),
      );
    });
  });
});
