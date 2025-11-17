import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';

export abstract class BaseRepository {
  constructor(protected readonly db: IDb = prisma) {}
}
