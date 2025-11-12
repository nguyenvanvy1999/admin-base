import type { CategoryType } from '@server/generated/prisma/enums';
import type { CategoryWhereInput } from '@server/generated/prisma/models/Category';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import {
  type CategorySeedData,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INVESTMENT_CATEGORY,
  LOAN_CATEGORIES,
  TRANSFER_CATEGORY,
} from '../constants/category';
import type {
  CategoryListResponse,
  CategoryResponse,
  CategoryTreeResponse,
  IListCategoriesQueryDto,
  IUpsertCategoryDto,
} from '../dto/category.dto';

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

const CATEGORY_SELECT_MINIMAL = {
  id: true,
  isLocked: true,
  type: true,
  parentId: true,
} as const;

const formatCategory = (
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

const formatCategoryTree = (
  category: CategoryWithChildren,
): CategoryTreeResponse => {
  const children =
    category.children && category.children.length > 0
      ? category.children.map(formatCategoryTree)
      : undefined;

  return {
    ...formatCategory(category),
    children,
  } as CategoryTreeResponse;
};

export class CategoryService {
  private flattenCategories(
    categories: CategorySeedData[],
    parentName?: string,
  ): Array<{
    name: string;
    type: string;
    parentName?: string;
  }> {
    const result: Array<{
      name: string;
      type: string;
      parentName?: string;
    }> = [];

    for (const category of categories) {
      result.push({
        name: category.name,
        type: category.type,
        parentName,
      });

      if (category.children && category.children.length > 0) {
        const children = this.flattenCategories(
          category.children,
          category.name,
        );
        result.push(...children);
      }
    }

    return result;
  }

  async seedDefaultCategories(tx: any, userId: string): Promise<void> {
    const allCategories: CategorySeedData[] = [
      ...LOAN_CATEGORIES,
      TRANSFER_CATEGORY,
      INVESTMENT_CATEGORY,
      INCOME_CATEGORIES,
      ...EXPENSE_CATEGORIES,
    ];

    const flattened = this.flattenCategories(allCategories);

    const level0 = flattened.filter((cat) => !cat.parentName);
    const level1 = flattened.filter((cat) => cat.parentName);

    const nameToIdMap = new Map<string, string>();

    if (level0.length > 0) {
      await tx.category.createMany({
        data: level0.map((cat) => ({
          userId,
          name: cat.name,
          type: cat.type,
          parentId: null,
          isLocked: true,
        })),
      });

      const createdCategories = await tx.category.findMany({
        where: {
          userId,
          name: { in: level0.map((cat) => cat.name) },
        },
        select: { id: true, name: true },
      });

      for (const cat of createdCategories) {
        nameToIdMap.set(cat.name, cat.id);
      }
    }

    if (level1.length > 0) {
      await tx.category.createMany({
        data: level1.map((cat) => ({
          userId,
          name: cat.name,
          type: cat.type,
          parentId: nameToIdMap.get(cat.parentName!),
          isLocked: true,
        })),
      });
    }
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        deletedAt: null,
      },
      select: CATEGORY_SELECT_MINIMAL,
    });
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  }

  private buildCategoryTree(
    categories: CategoryWithChildren[],
  ): CategoryWithChildren[] {
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    for (const category of categories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    for (const category of categories) {
      const categoryWithChildren = categoryMap.get(category.id)!;
      if (category.parentId === null) {
        rootCategories.push(categoryWithChildren);
      } else {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(categoryWithChildren);
        }
      }
    }

    return rootCategories;
  }

  async getAllCategories(
    userId: string,
    query: IListCategoriesQueryDto = {},
  ): Promise<CategoryListResponse> {
    const { type, includeDeleted = false } = query;

    const where: CategoryWhereInput = {
      userId,
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,
        userId: true,
        type: true,
        name: true,
        parentId: true,
        isLocked: true,
        icon: true,
        color: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const tree = this.buildCategoryTree(categories as CategoryWithChildren[]);

    return { categories: tree.map(formatCategoryTree) } as CategoryListResponse;
  }

  async getCategoryById(
    userId: string,
    categoryId: string,
  ): Promise<CategoryResponse> {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        name: true,
        parentId: true,
        isLocked: true,
        icon: true,
        color: true,
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return formatCategory(category);
  }

  async createCategory(
    userId: string,
    data: IUpsertCategoryDto,
  ): Promise<CategoryResponse> {
    if (data.parentId) {
      const parent = await this.validateCategoryOwnership(
        userId,
        data.parentId,
      );

      if (parent.isLocked) {
        throw new Error('Cannot create child of locked category');
      }

      if (parent.type !== data.type) {
        throw new Error('Category type must match parent category type');
      }

      if (parent.parentId !== null) {
        throw new Error('Cannot create category with more than 2 levels');
      }
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        parentId: data.parentId ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        name: true,
        parentId: true,
        isLocked: true,
        icon: true,
        color: true,
      },
    });

    return formatCategory(category);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    data: IUpsertCategoryDto,
  ): Promise<CategoryResponse> {
    const category = await this.validateCategoryOwnership(userId, categoryId);

    if (category.isLocked) {
      throw new Error('Cannot update locked category');
    }

    if (data.parentId !== undefined) {
      if (data.parentId === categoryId) {
        throw new Error('Category cannot be its own parent');
      }

      if (data.parentId !== null) {
        const newParent = await this.validateCategoryOwnership(
          userId,
          data.parentId,
        );

        if (newParent.isLocked) {
          throw new Error('Cannot set locked category as parent');
        }

        if (newParent.type !== data.type) {
          throw new Error('Category type must match parent category type');
        }

        if (newParent.parentId !== null) {
          throw new Error('Cannot create category with more than 2 levels');
        }

        const hasCircularReference = await this.checkCircularReference(
          categoryId,
          data.parentId,
        );
        if (hasCircularReference) {
          throw new Error('Circular reference detected');
        }
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        type: data.type,
        parentId: data.parentId ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        name: true,
        parentId: true,
        isLocked: true,
        icon: true,
        color: true,
      },
    });

    return formatCategory(updatedCategory);
  }

  private async checkCircularReference(
    categoryId: string,
    potentialParentId: string,
  ): Promise<boolean> {
    let currentId = potentialParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        return true;
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const category = await prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!category || !category.parentId) {
        break;
      }
      currentId = category.parentId;
    }

    return false;
  }

  async deleteCategory(userId: string, categoryId: string) {
    const category = await this.validateCategoryOwnership(userId, categoryId);

    if (category.isLocked) {
      throw new Error('Cannot delete locked category');
    }

    const childrenCount = await prisma.category.count({
      where: {
        parentId: categoryId,
        deletedAt: null,
      },
    });

    if (childrenCount > 0) {
      throw new Error('Cannot delete category with children');
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Category deleted successfully' };
  }
}

export default new Elysia().decorate('categoryService', new CategoryService());
