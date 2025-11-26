import openapi from '@elysiajs/openapi';
import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';
import type { Elysia } from 'elysia';
import z from 'zod';
import packageJson from '../../package.json';

export const swaggerConfig = () => (app: Elysia) => {
  if (appEnv.ENB_SWAGGER_UI) {
    logger.info(`Setup Swagger UI at http://localhost:${appEnv.PORT}/swagger`);
    return app.use(
      openapi({
        mapJsonSchema: {
          zod: z.toJSONSchema,
        },
        swagger: {
          persistAuthorization: true,
        },
        documentation: {
          info: {
            title: 'FinTrack',
            description: 'FinTrack API Documentation',
            version: packageJson.version,
            contact: {
              name: 'Nguyen Van Vy',
              email: 'nguyenvanvy1999@gmail.com',
            },
            license: { name: 'MIT', url: 'https://opensource.org/license/mit' },
            termsOfService: 'termsOfService',
          },
          servers: [
            {
              url: `http://localhost:${appEnv.PORT}`,
              description: 'Local server',
            },
          ],
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
