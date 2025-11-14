import type { prisma } from '@server/configs/db';

export * from './auth.type';
export * from './dto';
export type IDb = typeof prisma;
