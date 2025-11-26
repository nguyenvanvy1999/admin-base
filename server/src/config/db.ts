import { PrismaPg } from '@prisma/adapter-pg';
import { env } from 'src/config/env';
import { logger } from 'src/config/logger';
import { PrismaClient } from 'src/generated';

const adapter = new PrismaPg({
  connectionString: env.POSTGRESQL_URI,
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
});

export const db = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
  errorFormat: 'minimal',
});

// Configure event listeners to prevent memory leaks
db.$on('error', (e) => {
  logger.error(`Database error at ${e.timestamp} : ${e.message}`);
});

export type IDb = typeof db;
