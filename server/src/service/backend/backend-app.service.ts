import process from 'node:process';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import type { BackendClusterService } from './backend-cluster.service';
import { backendClusterService } from './backend-cluster.service';
import type { BackendInitService } from './backend-init.service';
import { backendInitService } from './backend-init.service';
import type { BackendServerService } from './backend-server.service';
import { backendServerService } from './backend-server.service';

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
      clusterService: backendClusterService,
      initService: backendInitService,
      serverService: backendServerService,
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

export const backendAppService = new BackendAppService();
