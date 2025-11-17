import { t } from 'elysia';
import { z } from 'zod';
import { createListQueryDto, PaginationDto } from './common.dto';

export const UpsertTagDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const ListTagsQueryDto = createListQueryDto({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'created']).optional(),
});

export type IUpsertTagDto = z.infer<typeof UpsertTagDto>;
export type IListTagsQueryDto = z.infer<typeof ListTagsQueryDto>;

export const TagDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
    created: t.String(),
    modified: t.String(),
  }),
);

export const TagListResponseDto = t.NoValidate(
  t.Object({
    tags: t.Array(TagDto),
    pagination: PaginationDto,
  }),
);

export type TagResponse = typeof TagDto.static;
export type TagListResponse = typeof TagListResponseDto.static;
