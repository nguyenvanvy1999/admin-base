import process from 'node:process';
import cors from '@elysiajs/cors';
import { opentelemetry } from '@elysiajs/opentelemetry';
import { serverTiming } from '@elysiajs/server-timing';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import type { RedisClient } from 'bun';
import { type Spawn, spawn } from 'bun';
import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';
import { bullBoardConfig } from 'src/config/bull-board';
import { env, type IEnv } from 'src/config/env';
import { httpError } from 'src/config/error';
import { type ILogger, logger } from 'src/config/logger';
import { redis } from 'src/config/redis';
import { swaggerConfig } from 'src/config/swagger';
import {
  apiKeysController,
  apiKeyUsageController,
  auditLogsController,
  authController,
  captchaController,
  fileController,
  i18nAdminController,
  ipWhitelistController,
  miscController,
  notificationController,
  notificationTemplatesAdminController,
  oauthController,
  otpController,
  permissionsAdminController,
  rateLimitAdminController,
  rolesAdminController,
  sessionController,
  settingsAdminController,
  userAuthController,
  usersAdminController,
} from 'src/modules';
import { apiKeyUsageLoggerMiddleware } from 'src/services/api-keys';
import type { SeedService } from 'src/services/dev/seed.service';
import { seedService } from 'src/services/dev/seed.service';
import { gracefulShutdownService } from 'src/services/infrastructure/graceful-shutdown.service';
import { httpLoggerMiddleware } from 'src/services/middleware/http-logger.middleware';
import { ipWhitelistMiddleware } from 'src/services/security/ip-whitelist.middleware';
import { APP_ENV } from 'src/share';
import { reqMeta } from '../../config/request';

const WORKER_BINARY_PATH = './backend_worker';

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

export class BackendClusterService {
  constructor(
    private readonly deps: {
      initService: BackendInitService;
      env: IEnv;
      logger: ILogger;
      spawnFn: typeof spawn;
      workerBinaryPath: string;
      processPid: number;
      numCPUs: number;
    } = {
      initService: new BackendInitService(),
      env,
      logger,
      spawnFn: spawn,
      workerBinaryPath: WORKER_BINARY_PATH,
      processPid: process.pid,
      numCPUs: navigator.hardwareConcurrency,
    },
  ) {}

  async startCluster(): Promise<void> {
    this.deps.logger.info('🚀 Starting application in cluster mode...');
    this.deps.logger.info(`Primary process ${this.deps.processPid} is running`);

    await this.deps.initService.initData();

    const numCPUs = this.deps.numCPUs;
    this.deps.logger.info(`🔄 Spawning ${numCPUs} worker processes...`);

    const workers = new Array(numCPUs);

    const spawnOptions: Spawn.SpawnOptions<'inherit', 'inherit', 'inherit'> = {
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
      env: process.env,
    };

    for (let i = 0; i < numCPUs; i++) {
      workers[i] = this.deps.spawnFn({
        cmd: [this.deps.workerBinaryPath],
        ...spawnOptions,
      });

      workers[i].exited.then((exitCode: number) => {
        this.deps.logger.warn(
          `⚠️  Worker process exited with code ${exitCode}. Restarting...`,
        );
        workers[i] = this.deps.spawnFn({
          cmd: [this.deps.workerBinaryPath],
          ...spawnOptions,
        });
      });
    }

    const killAllWorkers = () => {
      this.deps.logger.info('🛑 Shutting down all worker processes...');
      for (const worker of workers) {
        worker.kill();
      }
      process.exit(0);
    };

    process.on('SIGINT', killAllWorkers);
    process.on('SIGTERM', killAllWorkers);
    process.on('exit', killAllWorkers);

    this.deps.logger.info('✅ All workers spawned successfully');
    this.deps.logger.info(
      `🎯 Cluster is ready with ${numCPUs} workers on port ${this.deps.env.PORT}`,
    );
  }
}

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
      .use(bullBoardConfig())
      .use(swaggerConfig())
      .group(this.deps.env.API_PREFIX, (app) =>
        app
          .use(cors())
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
          .use(ipWhitelistMiddleware())
          .use(apiKeyUsageLoggerMiddleware)
          .use(authController)
          .use(userAuthController)
          .use(otpController)
          .use(miscController)
          .use(captchaController)
          .use(fileController)
          .use(oauthController)
          .use(sessionController)
          .use(notificationController)
          .use(ipWhitelistController)
          .use(apiKeysController)
          .use(apiKeyUsageController)
          .use(usersAdminController)
          .use(rolesAdminController)
          .use(permissionsAdminController)
          .use(auditLogsController)
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

export class BackendAppService {
  constructor(
    private readonly deps: {
      clusterService: BackendClusterService;
      initService: BackendInitService;
      serverService: BackendServerService;
      env: IEnv;
      logger: ILogger;
      processPlatform: string;
    } = {
      clusterService: new BackendClusterService(),
      initService: new BackendInitService(),
      serverService: new BackendServerService(),
      env,
      logger,
      processPlatform: process.platform,
    },
  ) {}

  async start(): Promise<void> {
    const USE_CLUSTER =
      this.deps.env.ENB_CLUSTER && this.deps.processPlatform === 'linux';

    if (USE_CLUSTER) {
      await this.deps.clusterService.startCluster();
    } else {
      this.deps.logger.info(
        '🚀 Starting application in single instance mode...',
      );
      await this.deps.initService.initData();
      await this.deps.serverService.createServer();
    }
  }
}

export const backendServerService = new BackendServerService();
export const backendAppService = new BackendAppService();
