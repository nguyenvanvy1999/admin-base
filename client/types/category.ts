import type { CategoryTreeResponse } from '@server/dto/category.dto';
import type { CategoryType } from '@server/generated/prisma/enums';

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
