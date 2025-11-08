import { staticPlugin } from '@elysiajs/static';
import swagger from '@elysiajs/swagger';
import { appEnv } from '@server/libs/env';
import { Elysia } from 'elysia';
import accountController from './controllers/account.controller';
import userController from './controllers/user.controller';
import { logger } from './libs/logger';
import errorMiddleware from './middlewares/error-middleware';

export const app = new Elysia()
  .use(
    swagger({
      path: '/api-docs',
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
      swaggerOptions: {
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
    group.onError(errorMiddleware).use(userController).use(accountController),
  )
  .listen(appEnv.PORT);

logger.info(
  `Server started open http://${app.server?.hostname}:${app.server?.port} in the browser`,
);
logger.info(
  `API can be found at  http://${app.server?.hostname}:${app.server?.port}/api/docs in the browser`,
);
