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
  sortBy: t.Optional(
    t.Union([t.Literal('name'), t.Literal('type'), t.Literal('createdAt')]),
  ),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertEntityDto = typeof UpsertEntityDto.static;
export type IListEntitiesQueryDto = typeof ListEntitiesQueryDto.static;

export const EntityDto = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.Enum(EntityType),
  phone: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  address: t.Nullable(t.String()),
  note: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const EntityPaginationDto = t.Object({
  page: t.Integer(),
  limit: t.Integer(),
  total: t.Integer(),
  totalPages: t.Integer(),
});

export const EntityListResponseDto = t.Object({
  entities: t.Array(EntityDto),
  pagination: EntityPaginationDto,
});

export const EntityDeleteResponseDto = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

export type EntityResponse = typeof EntityDto.static;
export type EntityListResponse = typeof EntityListResponseDto.static;
export type EntityDeleteResponse = typeof EntityDeleteResponseDto.static;
