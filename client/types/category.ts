import type { CategoryType } from '@server/generated/prisma/enums';
import type { CategoryTreeResponse } from '@server/src/dto/category.dto';

export type CategoryFull = CategoryTreeResponse;

export type CategoryFormData = {
  id?: string;
  name: string;
  type: CategoryType;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
};

export type MUITreeItem = {
  id: string;
  label: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  isLocked: boolean;
  parentId: string | null;
  children?: MUITreeItem[];
};
