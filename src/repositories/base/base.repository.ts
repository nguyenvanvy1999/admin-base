import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';

export abstract class BaseRepository {
  protected constructor(protected readonly db: IDb = prisma) {}
}
