import { t } from 'elysia';
import { z } from 'zod';
import {
  createListQueryDto,
  DeleteManyDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

export const UpsertTagDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const ListTagsQueryDto = createListQueryDto({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt']).optional(),
});

export const DeleteManyTagsDto = DeleteManyDto;

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

export const TagListResponseDto = t.NoValidate(
  t.Object({
    tags: t.Array(TagDto),
    pagination: PaginationDto,
  }),
);

export const TagDeleteResponseDto = DeleteResponseDto;

export type TagResponse = typeof TagDto.static;
export type TagListResponse = typeof TagListResponseDto.static;
export type TagDeleteResponse = typeof TagDeleteResponseDto.static;
