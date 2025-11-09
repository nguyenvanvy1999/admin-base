import { EntityType } from '@server/generated/prisma/enums';
import { t } from 'elysia';

export const UpsertEntityDto = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  type: t.Union([
    t.Literal(EntityType.individual),
    t.Literal(EntityType.organization),
  ]),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String()),
  address: t.Optional(t.String()),
  note: t.Optional(t.String()),
});

export const ListEntitiesQueryDto = t.Object({
  search: t.Optional(t.String()),
  type: t.Optional(
    t.Array(
      t.Union([
        t.Literal(EntityType.individual),
        t.Literal(EntityType.organization),
      ]),
    ),
  ),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 20 })),
  sortBy: t.Optional(t.Union([t.Literal('name'), t.Literal('createdAt')])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertEntityDto = typeof UpsertEntityDto.static;
export type IListEntitiesQueryDto = typeof ListEntitiesQueryDto.static;
