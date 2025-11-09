import { t } from 'elysia';

export const UpsertTagDto = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  description: t.Optional(t.String()),
});

export const ListTagsQueryDto = t.Object({
  search: t.Optional(t.String()),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 20 })),
  sortBy: t.Optional(t.Union([t.Literal('name'), t.Literal('createdAt')])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertTagDto = typeof UpsertTagDto.static;
export type IListTagsQueryDto = typeof ListTagsQueryDto.static;
