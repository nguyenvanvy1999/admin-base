import process from 'node:process';
import { initData } from '@server/app/server/init';
import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';
import { type Spawn, spawn } from 'bun';

const WORKER_BINARY_PATH = './backend_worker';

export async function startCluster() {
  logger.info('🚀 Starting application in cluster mode...');
  logger.info(`Primary process ${process.pid} is running`);

  // Initialize data in primary process
  await initData();

  const numCPUs = navigator.hardwareConcurrency;
  logger.info(`🔄 Spawning ${numCPUs} worker processes...`);

  const workers = new Array(numCPUs);

  const spawnOptions: Spawn.BaseOptions<'inherit', 'inherit', 'inherit'> = {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: process.env,
  };

  for (let i = 0; i < numCPUs; i++) {
    workers[i] = spawn({
      cmd: [WORKER_BINARY_PATH],
      ...spawnOptions,
    });

    workers[i].exited.then((exitCode: number) => {
      logger.warn(
        `⚠️  Worker process exited with code ${exitCode}. Restarting...`,
      );
      workers[i] = spawn({
        cmd: [WORKER_BINARY_PATH],
        ...spawnOptions,
      });
    });
  }

  function killAllWorkers() {
    logger.info('🛑 Shutting down all worker processes...');
    for (const worker of workers) {
      worker.kill();
    }
    process.exit(0);
  }

  process.on('SIGINT', killAllWorkers);
  process.on('SIGTERM', killAllWorkers);
  process.on('exit', killAllWorkers);

  logger.info('✅ All workers spawned successfully');
  logger.info(
    `🎯 Cluster is ready with ${numCPUs} workers on port ${appEnv.PORT}`,
  );
}
