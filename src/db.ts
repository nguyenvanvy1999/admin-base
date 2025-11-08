import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import { appEnv } from '@server/env';
import { PrismaClient } from './generated/prisma/client';

const adapter = new PrismaBetterSQLite3({
  url: appEnv.DB_URI,
});
export const prisma = new PrismaClient({ adapter });
