import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import type { SeedService } from 'src/service/misc/seed.service';
import { seedService } from 'src/service/misc/seed.service';
import type { CurrencyCacheService } from 'src/service/p2p/currency-cache.service';
import { currencyCacheService } from 'src/service/p2p/currency-cache.service';

export class BackendInitService {
  constructor(
    private readonly deps: {
      currencyCacheService: CurrencyCacheService;
      seedService: SeedService;
      env: IEnv;
      logger: ILogger;
    } = {
      currencyCacheService,
      seedService,
      env,
      logger,
    },
  ) {}

  async initData(): Promise<void> {
    if (this.deps.env.ENB_WARM_CACHE) {
      this.deps.logger.info('🔥 Warming currency and network cache...');
      await this.deps.currencyCacheService.warmCache();
      this.deps.logger.info('✅ Warm cache currency completed');
    }

    if (this.deps.env.ENB_SEED) {
      this.deps.logger.info('🌱 Starting database seeding...');
      await this.deps.seedService.seedAll();
      this.deps.logger.info('✅ Database seeding completed');
    }
  }
}

export const backendInitService = new BackendInitService();
