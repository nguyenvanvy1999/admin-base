import { CategoryType } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';
import { createArrayPreprocess, DeleteResponseDto } from './common.dto';

export const UpsertCategoryDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  parentId: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const ListCategoriesQueryDto = z.object({
  type: createArrayPreprocess(z.enum(CategoryType)),
  includeDeleted: z.boolean().default(false).optional(),
});

export type IUpsertCategoryDto = z.infer<typeof UpsertCategoryDto>;
export type IListCategoriesQueryDto = z.infer<typeof ListCategoriesQueryDto>;

export const CategoryDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    type: t.Enum(CategoryType),
    name: t.String(),
    parentId: t.Nullable(t.String()),
    icon: t.Nullable(t.String()),
    color: t.Nullable(t.String()),
    isLocked: t.Boolean(),
  }),
);

export const CategoryTreeDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    type: t.Enum(CategoryType),
    name: t.String(),
    parentId: t.Nullable(t.String()),
    icon: t.Nullable(t.String()),
    color: t.Nullable(t.String()),
    isLocked: t.Boolean(),
    children: t.Optional(t.Array(t.Unknown())),
  }),
);

export const CategoryListResponseDto = t.NoValidate(
  t.Object({
    categories: t.Array(CategoryTreeDto),
  }),
);

export const CategoryDeleteResponseDto = DeleteResponseDto;

export type CategoryResponse = typeof CategoryDto.static;
export type CategoryTreeResponse = typeof CategoryTreeDto.static;
export type CategoryListResponse = typeof CategoryListResponseDto.static;
export type CategoryDeleteResponse = typeof CategoryDeleteResponseDto.static;
