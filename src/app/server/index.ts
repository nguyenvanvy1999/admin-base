import process from 'node:process';
import { initData } from '@server/app/server/init';
import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';

try {
  const USE_CLUSTER = appEnv.ENB_CLUSTER && process.platform === 'linux';

  if (USE_CLUSTER) {
    const { startCluster } = await import('./cluster');
    await startCluster();
  } else {
    logger.info('Starting application in single instance mode...');
    await initData();

    const { createServer } = await import('./server');
    await createServer();
  }
} catch (e) {
  logger.error('App start failed!');
  logger.error(`Error details: ${e}`);
  logger.error(
    `Error stack: ${e instanceof Error ? e.stack : 'No stack trace'}`,
  );
  logger.error(
    `Error name: ${e instanceof Error ? e.name : 'Unknown error type'}`,
  );
  logger.error(`Error message: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
