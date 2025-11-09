import type { CategoryWhereInput } from '@server/generated/prisma/models/Category';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import {
  type CategorySeedData,
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORY,
  LOAN_CATEGORIES,
  TRANSFER_CATEGORY,
} from '../constants/category';
import type {
  IListCategoriesQueryDto,
  IUpsertCategoryDto,
} from '../dto/category.dto';

type CategoryWithChildren = {
  id: string;
  userId: string;
  type: string;
  name: string;
  parentId: string | null;
  isLocked: boolean;
  children?: CategoryWithChildren[];
};

export class CategoryService {
  private async createSeedCategory(
    tx: any,
    userId: string,
    categoryData: CategorySeedData,
    parentId?: string,
  ): Promise<string> {
    const category = await tx.category.create({
      data: {
        userId,
        name: categoryData.name,
        type: categoryData.type,
        parentId,
        isLocked: true,
      },
    });

    if (categoryData.children && categoryData.children.length > 0) {
      for (const child of categoryData.children) {
        await this.createSeedCategory(tx, userId, child, category.id);
      }
    }

    return category.id;
  }

  async seedDefaultCategories(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const category of LOAN_CATEGORIES) {
        await this.createSeedCategory(tx, userId, category);
      }

      await this.createSeedCategory(tx, userId, TRANSFER_CATEGORY);
      await this.createSeedCategory(tx, userId, INVESTMENT_CATEGORY);

      for (const category of EXPENSE_CATEGORIES) {
        await this.createSeedCategory(tx, userId, category);
      }
    });
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        deletedAt: null,
      },
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
  ): Promise<{ categories: CategoryWithChildren[] }> {
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
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const tree = this.buildCategoryTree(categories as CategoryWithChildren[]);

    return { categories: tree };
  }

  async getCategoryById(userId: string, categoryId: string) {
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
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async createCategory(userId: string, data: IUpsertCategoryDto) {
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
    }

    return prisma.category.create({
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
      },
    });
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    data: IUpsertCategoryDto,
  ) {
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

        const hasCircularReference = await this.checkCircularReference(
          categoryId,
          data.parentId,
        );
        if (hasCircularReference) {
          throw new Error('Circular reference detected');
        }
      }
    }

    return prisma.category.update({
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
      },
    });
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
