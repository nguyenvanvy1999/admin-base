import process from 'node:process';
import { type SpawnOptions, spawn } from 'bun';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import type { BackendInitService } from './backend-init.service';
import { backendInitService } from './backend-init.service';

const WORKER_BINARY_PATH = './backend_worker';

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
      initService: backendInitService,
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

    const spawnOptions: SpawnOptions.SpawnOptions<
      'inherit',
      'inherit',
      'inherit'
    > = {
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

export const backendClusterService = new BackendClusterService();
