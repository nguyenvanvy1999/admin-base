import { RedisClient } from 'bun';
import { env } from 'src/config/env';
import { logger } from 'src/config/logger';

export const redisPub = new RedisClient(env.REDIS_URI);
export const redisSub = new RedisClient(env.REDIS_URI);

redisPub.onclose = (err: unknown) => {
  if (err) {
    logger.error(`Redis Pub Client Error: ${String(err)}`);
  }
};

redisSub.onclose = (err: unknown) => {
  if (err) {
    logger.error(`Redis Sub Client Error: ${String(err)}`);
  }
};
