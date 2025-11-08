import { PrismaPg } from '@prisma/adapter-pg';
import { appEnv } from '@server/env';
import { PrismaClient } from './generated/prisma/client';

const adapter = new PrismaPg({
  url: appEnv.POSTGRES_URL,
});
export const prisma = new PrismaClient({ adapter });
