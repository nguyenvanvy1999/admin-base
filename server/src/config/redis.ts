import { RedisClient } from 'bun';
import { env } from 'src/config/env';
import { logger } from 'src/config/logger';

export const redis: RedisClient = new RedisClient(env.REDIS_URI);

redis.onclose = (err: unknown) => {
  if (err) {
    logger.error(`Redis Client Error: ${String(err)}`);
  }
};

redis.onconnect = () => {
  logger.info('Connected to Redis server');
};
