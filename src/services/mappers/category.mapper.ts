import type { CategoryType } from '@server/generated';
import type {
  CategoryResponse,
  CategoryTreeResponse,
} from '../../dto/category.dto';

type CategoryWithChildren = {
  id: string;
  userId: string;
  type: CategoryType;
  name: string;
  parentId: string | null;
  isLocked: boolean;
  icon: string | null;
  color: string | null;
  children?: CategoryWithChildren[];
};

export const mapCategory = (
  category: Pick<
    CategoryWithChildren,
    | 'id'
    | 'userId'
    | 'type'
    | 'name'
    | 'parentId'
    | 'icon'
    | 'color'
    | 'isLocked'
  >,
): CategoryResponse => ({
  ...category,
  parentId: category.parentId ?? null,
  icon: category.icon ?? null,
  color: category.color ?? null,
});

export const mapCategoryTree = (
  category: CategoryWithChildren,
): CategoryTreeResponse => {
  const children =
    category.children && category.children.length > 0
      ? category.children.map(mapCategoryTree)
      : undefined;

  return {
    ...mapCategory(category),
    children,
  } as CategoryTreeResponse;
};
