import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { ENTITY_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type EntityRecord = Prisma.EntityGetPayload<{
  select: typeof ENTITY_SELECT_FULL;
}>;

export class EntityRepository extends BaseRepository<
  typeof prisma.entity,
  EntityRecord,
  typeof ENTITY_SELECT_FULL
> {
  constructor() {
    super(prisma.entity, ENTITY_SELECT_FULL);
  }

  /**
   * Find entity by name and user ID (specific method)
   */
  async findByNameAndUserId(
    name: string,
    userId: string,
  ): Promise<EntityRecord | null> {
    return prisma.entity.findFirst({
      where: { name, userId },
      select: this.select,
    });
  }
}

export const entityRepository = new EntityRepository();
