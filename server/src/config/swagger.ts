import openapi from '@elysiajs/openapi';
import type { Elysia } from 'elysia';
import { env } from 'src/config/env';
import { logger } from 'src/config/logger';
import { DOC_OPTIONS } from 'src/share';
import packageJson from '../../package.json';

export const swaggerConfig = () => (app: Elysia) => {
  if (env.ENB_SWAGGER_UI) {
    logger.info(`🔧 Setup Swagger UI at ${env.BACKEND_URL}/swagger`);
    return app.use(
      openapi({
        documentation: {
          info: { ...DOC_OPTIONS.info, version: packageJson.version },
          servers: [
            {
              url: `http://localhost:${env.PORT}`,
              description: 'Local server',
            },
            {
              url: env.BACKEND_URL,
              description: 'Production server',
            },
          ],
          tags: Object.values(DOC_OPTIONS.tags),
          components: {
            securitySchemes: {
              accessToken: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
              refreshToken: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
              apiKey: {
                type: 'apiKey',
                name: 'apiKey',
                in: 'header',
              },
            },
          },
        },
        provider: 'swagger-ui',
        path: `/swagger`,
      }),
    );
  }
  return app;
};
