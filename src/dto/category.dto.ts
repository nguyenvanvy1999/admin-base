import { CategoryType } from '@server/generated/prisma/enums';
import { t } from 'elysia';

export const UpsertCategoryDto = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  type: t.Enum(CategoryType),
  parentId: t.Optional(t.String()),
  icon: t.Optional(t.String()),
  color: t.Optional(t.String()),
});

export const ListCategoriesQueryDto = t.Object({
  type: t.Optional(t.Array(t.Enum(CategoryType))),
  includeDeleted: t.Optional(t.Boolean({ default: false })),
});

export type IUpsertCategoryDto = typeof UpsertCategoryDto.static;
export type IListCategoriesQueryDto = typeof ListCategoriesQueryDto.static;

export const CategoryDto = t.Object({
  id: t.String(),
  userId: t.String(),
  type: t.Enum(CategoryType),
  name: t.String(),
  parentId: t.Nullable(t.String()),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  isLocked: t.Boolean(),
});

export const CategoryTreeDto = t.Object({
  id: t.String(),
  userId: t.String(),
  type: t.Enum(CategoryType),
  name: t.String(),
  parentId: t.Nullable(t.String()),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  isLocked: t.Boolean(),
  children: t.Optional(t.Array(t.Unknown())),
});

export const CategoryListResponseDto = t.Object({
  categories: t.Array(CategoryTreeDto),
});

export const CategoryDeleteResponseDto = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

export type CategoryResponse = typeof CategoryDto.static;
export type CategoryTreeResponse = typeof CategoryTreeDto.static;
export type CategoryListResponse = typeof CategoryListResponseDto.static;
export type CategoryDeleteResponse = typeof CategoryDeleteResponseDto.static;
