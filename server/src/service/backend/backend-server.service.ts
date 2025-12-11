import cors from '@elysiajs/cors';
import { opentelemetry } from '@elysiajs/opentelemetry';
import { serverTiming } from '@elysiajs/server-timing';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import type { RedisClient } from 'bun';
import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';
import { elysiaXSS } from 'elysia-xss';
import { bullBoardConfig } from 'src/config/bull-board';
import { env, type IEnv } from 'src/config/env';
import { httpError } from 'src/config/error';
import { type ILogger, logger } from 'src/config/logger';
import { redis } from 'src/config/redis';
import { swaggerConfig } from 'src/config/swagger';
import {
  auditLogsAdminController,
  auditLogsUserController,
  authController,
  captchaController,
  fileController,
  i18nAdminController,
  ipWhitelistAdminController,
  ipWhitelistUserController,
  mfaBackupController,
  mfaController,
  miscController,
  notificationAdminController,
  notificationTemplatesAdminController,
  notificationUserController,
  oauthController,
  otpController,
  permissionsAdminController,
  rateLimitAdminController,
  rolesAdminController,
  securityEventsAdminController,
  securityEventsUserController,
  sessionAdminController,
  sessionUserController,
  settingsAdminController,
  userAuthController,
  usersAdminController,
} from 'src/modules';
import { adminAuthMiddleware } from 'src/service/auth/auth.middleware';
import { gracefulShutdownService } from 'src/service/misc/graceful-shutdown.service';
import { httpLoggerMiddleware } from 'src/service/misc/http-logger.middleware';
import { userIpWhitelistMiddleware } from 'src/service/user-ip-whitelist';
import { APP_ENV } from 'src/share';
import { reqMeta } from '../../config/request';

export class BackendServerService {
  constructor(
    private readonly deps: {
      env: IEnv;
      logger: ILogger;
      redis: RedisClient;
      processPid: number;
    } = {
      env,
      logger,
      redis,
      processPid: process.pid,
    },
  ) {}

  async createServer(): Promise<Elysia> {
    this.deps.logger.info('🔧 Setting up Elysia application...');

    const app = new Elysia({
      aot: true,
      serve: {
        maxRequestBodySize: 1024 * 1024 * this.deps.env.REQ_BODY_MAX_SIZE_MB,
        idleTimeout: this.deps.env.REQ_TIMEOUT_SECOND,
      },
    });

    if (this.deps.env.ENB_HTTP_LOG) {
      app.use(httpLoggerMiddleware());
    }

    app
      .use(httpError())
      .use(rateLimit({ max: 300 }))
      .onBeforeHandle(adminAuthMiddleware)
      .use(bullBoardConfig())
      .use(swaggerConfig())
      .group(this.deps.env.API_PREFIX, (app) =>
        app
          .use(cors())
          .use(elysiaXSS({ as: 'global' }))
          .use([
            ...(this.deps.env.APP_ENV === APP_ENV.DEV
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
          .use(reqMeta)
          .use(userIpWhitelistMiddleware())
          .use(authController)
          .use(userAuthController)
          .use(otpController)
          .use(miscController)
          .use(captchaController)
          .use(fileController)
          .use(oauthController)
          .use(mfaController)
          .use(mfaBackupController)
          .use(sessionAdminController)
          .use(sessionUserController)
          .use(notificationAdminController)
          .use(notificationUserController)
          .use(ipWhitelistAdminController)
          .use(ipWhitelistUserController)
          .use(usersAdminController)
          .use(rolesAdminController)
          .use(permissionsAdminController)
          .use(auditLogsAdminController)
          .use(auditLogsUserController)
          .use(securityEventsAdminController)
          .use(securityEventsUserController)
          .use(i18nAdminController)
          .use(settingsAdminController)
          .use(notificationTemplatesAdminController)
          .use(rateLimitAdminController),
      );

    gracefulShutdownService.setupShutdownHandlers();

    await this.deps.redis.connect();

    const filteredRoutes = app.routes.filter(
      (r) => !r.path.includes('/queues') && !r.path.includes('/admin/queues'),
    );
    this.deps.logger.info(
      `📋 Registered ${filteredRoutes.length} routes (excluding queues)`,
    );
    this.deps.logger.info(
      `Routes at startup:\n${filteredRoutes.map((r) => `  ${r.method} ${r.path}`).join('\n')}`,
    );

    app.listen({
      port: this.deps.env.PORT,
      reusePort: true,
    });

    this.deps.logger.info(
      `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port} (PID: ${this.deps.processPid})`,
    );

    return app;
  }
}

export const backendServerService = new BackendServerService();
