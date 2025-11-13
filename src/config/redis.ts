import { appEnv } from '@server/libs/env';
import { logger } from '@server/libs/logger';
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
