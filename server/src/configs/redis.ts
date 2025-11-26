import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';
import { RedisClient } from 'bun';

export const redis: RedisClient = new RedisClient(appEnv.REDIS_URI);

redis.onclose = (err: unknown) => {
  if (err) {
    logger.error(`Redis Client Error: ${String(err)}`);
  }
};

redis.onconnect = () => {
  logger.info('Connected to Redis server');
};
