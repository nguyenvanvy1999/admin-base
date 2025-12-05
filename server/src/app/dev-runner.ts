import process from 'node:process';
import { logger } from 'src/config/logger';
import { backendAppService } from 'src/service/backend/backend-app.service';
import {
  auditLogWorkerService,
  workerManagerService,
} from 'src/service/worker';

async function startBackendService(): Promise<void> {
  try {
    logger.info('🚀 Starting Backend Service...');
    await backendAppService.start();
    logger.info('✅ Backend Service started successfully');
  } catch (e) {
    logger.error('💥 Backend Service start failed!');
    logger.error(`Error details: ${e}`);
    logger.error(
      `Error stack: ${e instanceof Error ? e.stack : 'No stack trace'}`,
    );
    throw e;
  }
}

function startWorkerService(): void {
  try {
    logger.info('🚀 Starting Worker Service...');
    workerManagerService.startMessageWorkers();
    logger.info('✅ Worker Service started successfully');
  } catch (e) {
    logger.error('💥 Worker Service start failed!');
    logger.error(`Error details: ${e}`);
    logger.error(
      `Error stack: ${e instanceof Error ? e.stack : 'No stack trace'}`,
    );
    throw e;
  }
}

async function startAuditLogService(): Promise<void> {
  try {
    logger.info('🚀 Starting Audit Log Service...');
    await auditLogWorkerService.startWorker();
    logger.info('✅ Audit Log Service started successfully');
  } catch (e) {
    logger.error('💥 Audit Log Service start failed!');
    logger.error(`Error details: ${e}`);
    logger.error(
      `Error stack: ${e instanceof Error ? e.stack : 'No stack trace'}`,
    );
    throw e;
  }
}

async function startAllServices(): Promise<void> {
  logger.info('🔧 Starting all services in development mode...');

  const services = [
    { name: 'Backend', start: startBackendService },
    { name: 'Worker', start: startWorkerService },
    { name: 'AuditLog', start: startAuditLogService },
  ];

  const results = await Promise.allSettled(
    services.map((service) => service.start()),
  );

  const failedServices = results
    .map((result, index) => ({
      service: services[index].name,
      result,
    }))
    .filter(({ result }) => result.status === 'rejected');

  if (failedServices.length > 0) {
    logger.error('💥 Some services failed to start:');
    failedServices.forEach(({ service, result }) => {
      logger.error(
        `  - ${service}: ${result.status === 'rejected' ? result.reason : 'Unknown error'}`,
      );
    });
    process.exit(1);
  }

  logger.info('✅ All services started successfully!');
}

startAllServices().catch((error) => {
  logger.error('💥 Failed to start services:', error);
  process.exit(1);
});
