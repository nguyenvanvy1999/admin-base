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

export const TagDto = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const TagPaginationDto = t.Object({
  page: t.Integer(),
  limit: t.Integer(),
  total: t.Integer(),
  totalPages: t.Integer(),
});

export const TagListResponseDto = t.Object({
  tags: t.Array(TagDto),
  pagination: TagPaginationDto,
});

export const TagDeleteResponseDto = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

export type TagResponse = typeof TagDto.static;
export type TagListResponse = typeof TagListResponseDto.static;
export type TagDeleteResponse = typeof TagDeleteResponseDto.static;
