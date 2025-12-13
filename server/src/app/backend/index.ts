import process from 'node:process';
import { logger } from 'src/config/logger';
import { backendAppService } from 'src/service/infrastructure/backend.service';

try {
  await backendAppService.start();
} catch (e) {
  logger.error('💥 App start failed!');
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
