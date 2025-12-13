import { logger } from 'src/config/logger';
import { workerManagerService } from 'src/service/infrastructure/worker.service';

try {
  logger.info('🚀 Starting queues...');
  workerManagerService.startMessageWorkers();
} catch (e) {
  const { logger } = await import('src/config/logger');
  logger.error('💥 Worker start failed!');
  logger.error(`Error details: ${e}`);
  logger.error(
    `Error stack: ${e instanceof Error ? e.stack : 'No stack trace'}`,
  );
  process.exit(1);
}
