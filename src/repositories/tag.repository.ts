import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { TAG_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type TagRecord = Prisma.TagGetPayload<{
  select: typeof TAG_SELECT_FULL;
}>;

export class TagRepository extends BaseRepository<
  TagRecord,
  typeof TAG_SELECT_FULL
> {
  constructor(db: IDb = prisma) {
    super(db, 'tag', TAG_SELECT_FULL);
  }

  /**
   * Find tag by name and user ID
   */
  async findByNameAndUserId(
    name: string,
    userId: string,
  ): Promise<TagRecord | null> {
    return this.db.tag.findFirst({
      where: { name, userId },
      select: this.select,
    });
  }
}

export const tagRepository = new TagRepository();
