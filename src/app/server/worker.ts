import process from 'node:process';
import { logger } from '@server/configs/logger';
import { createServer } from './server';

logger.info(`Worker ${process.pid} starting...`);

try {
  await createServer();
  logger.info(`Worker ${process.pid} is ready and listening`);
} catch (error) {
  logger.error(`Worker ${process.pid} failed to start!`);
  logger.error(`Error: ${error}`);
  logger.error(
    `Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`,
  );
  process.exit(1);
}
