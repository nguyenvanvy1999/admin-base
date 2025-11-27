import { logger } from 'src/config/logger';
import { auditLogWorkerService } from 'src/service/worker';

try {
  logger.info('🚀 Starting Audit Log Worker (BullMQ)...');

  await auditLogWorkerService.startWorker();

  logger.info('✅ Audit Log Worker running');
} catch (e) {
  logger.error('💥 Audit Log Worker start failed!');
  logger.error(`Error details: ${e}`);
  logger.error(
    `Error stack: ${e instanceof Error ? e.stack : 'No stack trace'}`,
  );
  process.exit(1);
}
