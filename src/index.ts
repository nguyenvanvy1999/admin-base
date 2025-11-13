import openapi from '@elysiajs/openapi';
import { staticPlugin } from '@elysiajs/static';
import { appEnv } from '@server/libs/env';
import { Elysia } from 'elysia';
import accountController from './controllers/account.controller';
import categoryController from './controllers/category.controller';
import contributionController from './controllers/contribution.controller';
import currencyController from './controllers/currency.controller';
import entityController from './controllers/entity.controller';
import eventController from './controllers/event.controller';
import investmentController from './controllers/investment.controller';
import reportController from './controllers/report.controller';
import tagController from './controllers/tag.controller';
import tradeController from './controllers/trade.controller';
import transactionController from './controllers/transaction.controller';
import userController from './controllers/user.controller';
import valuationController from './controllers/valuation.controller';
import { logger } from './libs/logger';
import { errorHandler } from './middlewares/error-middleware';

export const app = new Elysia()
  .use(
    openapi({
      path: '/docs',
      provider: 'swagger-ui',
      documentation: {
        info: {
          title: 'FinTrack',
          description: 'FinTrack API Documentation',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            JwtAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'Enter JWT Bearer token **_only_**',
            },
          },
        },
      },
      swagger: {
        persistAuthorization: true,
      },
    }),
  )
  .use(
    await staticPlugin({
      prefix: '/',
      assets: './client',
    }),
  )
  .group('/api', (group) =>
    group
      .use(errorHandler)
      .use(userController)
      .use(accountController)
      .use(categoryController)
      .use(currencyController)
      .use(entityController)
      .use(eventController)
      .use(tagController)
      .use(transactionController)
      .use(investmentController)
      .use(tradeController)
      .use(contributionController)
      .use(valuationController)
      .use(reportController),
  )
  .listen(appEnv.PORT);

logger.info(
  `Server started open http://${app.server?.hostname}:${app.server?.port} in the browser`,
);
logger.info(
  `API can be found at  http://${app.server?.hostname}:${app.server?.port}/docs in the browser`,
);
