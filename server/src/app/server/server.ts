import cors from '@elysiajs/cors';
import { opentelemetry } from '@elysiajs/opentelemetry';
import { serverTiming } from '@elysiajs/server-timing';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';
import { httpError } from '@server/configs/middlewares/error.middleware';
import { httpLogger } from '@server/configs/middlewares/http-logger.middleware';
import { redis } from '@server/configs/redis';
import { swaggerConfig } from '@server/configs/swagger';
import { adminController } from '@server/controllers/admin';
import currencyController from '@server/controllers/currency.controller';
import userController from '@server/controllers/user.controller';
import { gracefulShutdownService } from '@server/services/misc';
import { Elysia } from 'elysia';
import { elysiaXSS } from 'elysia-xss';
import { elysiaHelmet } from 'elysiajs-helmet';

export async function createServer() {
  logger.info('Setting up Elysia application...');

  const app = new Elysia({
    aot: true,
    serve: {
      maxRequestBodySize: 1024 * 1024 * appEnv.REQ_BODY_MAX_SIZE_MB,
      idleTimeout: appEnv.REQ_TIMEOUT_SECOND,
    },
  });

  if (appEnv.ENB_HTTP_LOG) {
    app.use(httpLogger());
  }

  app
    .use(httpError())
    .use(swaggerConfig())
    .group('/api', (app) =>
      app
        .use(elysiaXSS({ as: 'global' }))
        .use(elysiaHelmet())
        .use(
          cors({
            methods: appEnv.CORS_ALLOW_METHOD ?? '*',
            origin: appEnv.CORS_ALLOW_ORIGIN,
            allowedHeaders: appEnv.CORS_ALLOW_HEADERS,
          }),
        )
        .use([
          ...(appEnv.ENB_TRACING
            ? [
                opentelemetry({
                  spanProcessors: [
                    new BatchSpanProcessor(new OTLPTraceExporter()),
                  ],
                }),
                serverTiming(),
              ]
            : []),
        ])
        .use([userController, adminController, currencyController]),
    );

  gracefulShutdownService.setupShutdownHandlers();

  await redis.connect();

  app.listen({
    port: appEnv.PORT,
    reusePort: true,
  });

  logger.info(
    `App is running at http://${app.server?.hostname}:${app.server?.port} (PID: ${process.pid})`,
  );

  return app;
}
