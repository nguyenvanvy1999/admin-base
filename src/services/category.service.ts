import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { CategoryType, CategoryWhereInput } from '@server/generated';
import {
  BALANCE_ADJUSTMENT_CATEGORIES,
  CATEGORY_NAME,
  type CategorySeedData,
  ErrorCode,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INVESTMENT_CATEGORY,
  LOAN_CATEGORIES,
  TRANSFER_CATEGORY,
  throwAppError,
} from '@server/share';
import type {
  CategoryListResponse,
  CategoryResponse,
  CategoryTreeResponse,
  IListCategoriesQueryDto,
  IUpsertCategoryDto,
} from '../dto/category.dto';
import { CATEGORY_SELECT_MINIMAL } from './selects';

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
  constructor(private readonly deps: { db: IDb } = { db: prisma }) {}

  getCategoryId(userId: string, code: string, type?: string): string {
    if (type) {
      return `category_${code}_${type}_${userId}`;
    }
    return `category_${code}_${userId}`;
  }

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
      ...BALANCE_ADJUSTMENT_CATEGORIES,
    ];

    const flattened = this.flattenCategories(allCategories);

    const level0 = flattened.filter((cat) => !cat.parentName);
    const level1 = flattened.filter((cat) => cat.parentName);

    const nameToIdMap = new Map<string, string>();

    if (level0.length > 0) {
      await tx.category.createMany({
        data: level0.map((cat) => ({
          id: this.getCategoryId(userId, cat.name, cat.type),
          userId,
          name: cat.name,
          type: cat.type,
          parentId: null,
          isLocked: true,
        })),
      });

      for (const cat of level0) {
        nameToIdMap.set(
          `${cat.name}_${cat.type}`,
          this.getCategoryId(userId, cat.name, cat.type),
        );
      }
    }

    if (level1.length > 0) {
      await tx.category.createMany({
        data: level1.map((cat) => {
          const parent = level0.find(
            (p) => p.name === cat.parentName && p.type === cat.type,
          );
          const parentKey = parent ? `${parent.name}_${parent.type}` : null;
          return {
            id: this.getCategoryId(userId, cat.name, cat.type),
            userId,
            name: cat.name,
            type: cat.type,
            parentId: parentKey ? (nameToIdMap.get(parentKey) ?? null) : null,
            isLocked: true,
          };
        }),
      });
    }
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.deps.db.category.findUnique({
      where: {
        id: categoryId,
      },
      select: CATEGORY_SELECT_MINIMAL,
    });
    if (
      !category ||
      category.userId !== userId ||
      category.deletedAt !== null
    ) {
      throwAppError(ErrorCode.CATEGORY_NOT_FOUND, 'Category not found');
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
      type: type && type.length > 0 ? { in: type } : undefined,
      userId,
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    const categories = await this.deps.db.category.findMany({
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
        created: 'asc',
      },
    });

    const tree = this.buildCategoryTree(categories as CategoryWithChildren[]);

    return { categories: tree.map(formatCategoryTree) } as CategoryListResponse;
  }

  async getCategoryById(
    userId: string,
    categoryId: string,
  ): Promise<CategoryResponse> {
    const category = await this.deps.db.category.findFirst({
      where: {
        id: categoryId,
        userId,
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
      throwAppError(ErrorCode.CATEGORY_NOT_FOUND, 'Category not found');
    }

    return formatCategory(category);
  }

  async getOrCreateBalanceAdjustmentCategory(
    userId: string,
    type: 'income' | 'expense',
  ): Promise<string> {
    const categoryType = type === 'income' ? 'income' : 'expense';
    const categoryName = CATEGORY_NAME.BALANCE_ADJUSTMENT;
    const categoryId = this.getCategoryId(userId, categoryName, categoryType);

    const existingCategory = await this.deps.db.category.findUnique({
      where: {
        id: categoryId,
      },
      select: { id: true },
    });

    if (existingCategory) {
      return existingCategory.id;
    }

    const newCategory = await this.deps.db.category.create({
      data: {
        id: categoryId,
        userId,
        name: categoryName,
        type: categoryType,
        parentId: null,
        isLocked: true,
      },
      select: { id: true },
    });

    return newCategory.id;
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
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot create child of locked category',
        );
      }

      if (parent.type !== data.type) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Category type must match parent category type',
        );
      }

      if (parent.parentId !== null) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot create category with more than 2 levels',
        );
      }
    }

    const categoryId = this.getCategoryId(userId, data.name);
    const category = await this.deps.db.category.create({
      data: {
        id: categoryId,
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
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot update locked category',
      );
    }

    if (data.parentId !== undefined) {
      if (data.parentId === categoryId) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Category cannot be its own parent',
        );
      }

      if (data.parentId !== null) {
        const newParent = await this.validateCategoryOwnership(
          userId,
          data.parentId,
        );

        if (newParent.isLocked) {
          throwAppError(
            ErrorCode.VALIDATION_ERROR,
            'Cannot set locked category as parent',
          );
        }

        if (newParent.type !== data.type) {
          throwAppError(
            ErrorCode.VALIDATION_ERROR,
            'Category type must match parent category type',
          );
        }

        if (newParent.parentId !== null) {
          throwAppError(
            ErrorCode.VALIDATION_ERROR,
            'Cannot create category with more than 2 levels',
          );
        }

        const hasCircularReference = await this.checkCircularReference(
          categoryId,
          data.parentId,
        );
        if (hasCircularReference) {
          throwAppError(
            ErrorCode.VALIDATION_ERROR,
            'Circular reference detected',
          );
        }
      }
    }

    const updatedCategory = await this.deps.db.category.update({
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

      const category = await this.deps.db.category.findUnique({
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
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot delete locked category',
      );
    }

    const childrenCount = await this.deps.db.category.count({
      where: {
        parentId: categoryId,
      },
    });

    if (childrenCount > 0) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot delete category with children',
      );
    }

    await this.deps.db.category.update({
      where: { id: categoryId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Category deleted successfully' };
  }
}

export const categoryService = new CategoryService();
