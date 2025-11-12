import { t } from 'elysia';
import { z } from 'zod';

export const UpsertTagDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const ListTagsQueryDto = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).default(20).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type IUpsertTagDto = z.infer<typeof UpsertTagDto>;
export type IListTagsQueryDto = z.infer<typeof ListTagsQueryDto>;

export const TagDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
);

export const TagPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const TagListResponseDto = t.NoValidate(
  t.Object({
    tags: t.Array(TagDto),
    pagination: TagPaginationDto,
  }),
);

export const TagDeleteResponseDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
);

export type TagResponse = typeof TagDto.static;
export type TagListResponse = typeof TagListResponseDto.static;
export type TagDeleteResponse = typeof TagDeleteResponseDto.static;
