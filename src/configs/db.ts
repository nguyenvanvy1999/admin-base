import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@server/generated/prisma/client';
import { appEnv } from './env';
import { logger } from './logger';

const adapter = new PrismaPg({
  connectionString: appEnv.POSTGRESQL_URI,
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
});
export const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

prisma.$on('error', (err) => logger.error('Prisma database error', { err }));

export type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
export type IDb = typeof prisma;
