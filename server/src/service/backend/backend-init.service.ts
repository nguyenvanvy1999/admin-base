import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import type { SeedService } from 'src/service/misc/seed.service';
import { seedService } from 'src/service/misc/seed.service';

export class BackendInitService {
  constructor(
    private readonly deps: {
      seedService: SeedService;
      env: IEnv;
      logger: ILogger;
    } = {
      seedService,
      env,
      logger,
    },
  ) {}

  async initData(): Promise<void> {
    if (this.deps.env.ENB_SEED) {
      this.deps.logger.info('🌱 Starting database seeding...');
      await this.deps.seedService.seedAll();
      this.deps.logger.info('✅ Database seeding completed');
    }
  }
}

export const backendInitService = new BackendInitService();
