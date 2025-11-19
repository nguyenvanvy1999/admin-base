import type { Prisma } from '@server/generated';
import type { ENTITY_SELECT_FULL } from '../selects';

export const mapEntity = (
  entity: Prisma.EntityGetPayload<{
    select: typeof ENTITY_SELECT_FULL;
  }>,
) => ({
  ...entity,
  created: entity.created.toISOString(),
  modified: entity.modified.toISOString(),
});
