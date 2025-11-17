import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';

export abstract class BaseRepository {
  constructor(protected readonly db: IDb = prisma) {}
}
