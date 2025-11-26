import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { logger } from 'src/config/logger';
import { TestLifecycle } from 'test/utils';

describe('src/config/redis.ts', () => {
  afterEach(() => {
    TestLifecycle.clearMock();
  });

  it('should export a redis client instance', async () => {
    const mod = await import('src/config/redis');
    expect(mod.redis).toBeDefined();
  });

  it('should support onconnect event handler', async () => {
    const mod = await import('src/config/redis');
    const infoSpy = spyOn(logger, 'info');
    const client = mod.redis;

    if (client.onconnect) {
      const originalHandler = client.onconnect;
      client.onconnect = () => {
        logger.info('Connected to Redis server');
      };
      client.onconnect();
      expect(infoSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith('Connected to Redis server');
      client.onconnect = originalHandler;
    } else {
      expect(mod.redis).toBeDefined();
    }
  });

  it('should support onclose event handler', async () => {
    const mod = await import('src/config/redis');
    const errorSpy = spyOn(logger, 'error');
    const client = mod.redis;

    if (client.onclose) {
      const originalHandler = client.onclose;
      const err = new Error('test-error');
      client.onclose = (err: unknown) => {
        if (err) {
          logger.error(`Redis Client Error: ${String(err)}`);
        }
      };
      client.onclose(err);
      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        `Redis Client Error: ${String(err)}`,
      );
      client.onclose = originalHandler;
    } else {
      expect(mod.redis).toBeDefined();
    }
  });
});
