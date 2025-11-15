import { staticPlugin } from '@elysiajs/static';
import { appEnv } from '@server/configs/env';
import { redis } from '@server/configs/redis';
import { swaggerConfig } from '@server/configs/swagger';
import { Elysia } from 'elysia';
import { logger } from './configs/logger';
import accountController from './controllers/account.controller';
import { adminController } from './controllers/admin';
import budgetController from './controllers/budget.controller';
import categoryController from './controllers/category.controller';
import contributionController from './controllers/contribution.controller';
import currencyController from './controllers/currency.controller';
import entityController from './controllers/entity.controller';
import eventController from './controllers/event.controller';
import exchangeRateController from './controllers/exchange-rate.controller';
import investmentController from './controllers/investment.controller';
import reportController from './controllers/report.controller';
import tagController from './controllers/tag.controller';
import tradeController from './controllers/trade.controller';
import transactionController from './controllers/transaction.controller';
import userController from './controllers/user.controller';
import valuationController from './controllers/valuation.controller';
import { AuthSeedService } from './services/auth-seed.service';
import { SeedService } from './services/seed.service';
import { seedSuperAdmin } from './services/super-admin-seed.service';
import { withErrorHandler } from './share/middlewares/error-middleware';

export const app = new Elysia()
  .use(swaggerConfig())
  .use(
    await staticPlugin({
      prefix: '/',
      assets: './client',
    }),
  )
  .group('/api', (group) =>
    withErrorHandler(group)
      .use(userController)
      .use(adminController)
      .use(accountController)
      .use(budgetController)
      .use(categoryController)
      .use(currencyController)
      .use(entityController)
      .use(eventController)
      .use(exchangeRateController)
      .use(tagController)
      .use(transactionController)
      .use(investmentController)
      .use(tradeController)
      .use(contributionController)
      .use(valuationController)
      .use(reportController),
  )
  .listen(appEnv.PORT);

await redis.connect();

if (appEnv.AUTO_SEED) {
  try {
    logger.info('Auto-seed enabled, starting seed process...');
    const seedService = new SeedService();
    const authSeedService = new AuthSeedService();

    logger.info('Starting currency seed...');
    await seedService.seedCurrencies();
    logger.info('Currency seed completed successfully!');

    logger.info('Starting auth seed (roles and permissions)...');
    await authSeedService.seedRolesAndPermissions();
    logger.info('Auth seed completed successfully!');

    if (appEnv.AUTO_SEED_SUPER_ADMIN) {
      logger.info(
        'Auto-seed super admin enabled, starting super admin seed...',
      );
      await seedSuperAdmin();
      logger.info('Super admin seed completed successfully!');
    }
  } catch (error) {
    logger.error('Error during auto-seed', { error });
  }
}

logger.info(
  `Server started open http://${app.server?.hostname}:${app.server?.port} in the browser`,
);
