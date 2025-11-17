import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';
import { seedService } from '@server/services/misc/seed.service';

export async function initData() {
  if (appEnv.ENB_SEED) {
    logger.info('Starting database seeding...');
    await seedService.seedAll();
    logger.info('Database seeding completed');
  }
}
