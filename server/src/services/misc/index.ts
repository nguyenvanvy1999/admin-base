import { logger } from 'src/config/logger';
import { redis } from 'src/config/redis';
import { createGeoIPService } from './geoip.service';
import { createIdempotencyService } from './idempotency.service';
import { createLockingService } from './locking.service';

export * from './geoip.service';
export * from './idempotency.service';
export * from './locking.service';

export const geoIPService = createGeoIPService({
  apiUrl: 'http://ip-api.com/json',
  logger: logger,
});

export const lockingService = createLockingService(redis, logger);

export const idempotencyService = createIdempotencyService(redis);
