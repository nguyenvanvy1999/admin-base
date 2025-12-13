import { logger } from 'src/config/logger';
import { auditLogWorkerService } from 'src/service/infrastructure/worker.service';

const auditLogLogger = logger.with({ service: 'audit-log-worker' });

try {
  auditLogLogger.info('🚀 Starting Audit Log Worker (BullMQ)...');

  await auditLogWorkerService.startWorker();

  auditLogLogger.info('✅ Audit Log Worker running');
} catch (e) {
  auditLogLogger.error('💥 Audit Log Worker start failed!');
  auditLogLogger.error(`Error details: ${e}`);
  auditLogLogger.error(
    `Error stack: ${e instanceof Error ? e.stack : 'No stack trace'}`,
  );
  process.exit(1);
}
