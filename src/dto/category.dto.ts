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
