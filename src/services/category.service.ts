import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { CategoryType, Prisma } from '@server/generated';
import {
  type CategoryRepository,
  categoryRepository,
} from '@server/repositories/category.repository';
import {
  BALANCE_ADJUSTMENT_CATEGORIES,
  CATEGORY_NAME,
  type CategorySeedData,
  DB_PREFIX,
  ErrorCode,
  EXPENSE_CATEGORIES,
  type IdUtil,
  INCOME_CATEGORIES,
  INVESTMENT_CATEGORY,
  idUtil,
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
import { BaseService } from './base/base.service';
import type { CacheService } from './base/cache.service';
import { cacheService } from './base/cache.service';
import type {
  ICacheService,
  IDb,
  IIdUtil,
  IOwnershipValidatorService,
} from './base/interfaces';
import { ownershipValidatorService } from './base/ownership-validator.service';

// Types for repository and responses
type CategoryRecord = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    userId: true;
    type: true;
    name: true;
    parentId: true;
    isLocked: true;
    icon: true;
    color: true;
  };
}>;

type CategoryWithChildren = CategoryRecord & {
  children?: CategoryWithChildren[];
};

export class CategoryService extends BaseService<
  CategoryRecord,
  IUpsertCategoryDto,
  CategoryResponse,
  CategoryListResponse,
  CategoryRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: CategoryRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
    } = {
      db: prisma,
      repository: categoryRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, {
      entityName: 'Category',
      dbPrefix: DB_PREFIX.CATEGORY,
    });
  }

  // #region Special Public Methods
  getCategoryId(userId: string, code: string, type?: string): string {
    if (type) {
      return `category_${code}_${type}_${userId}`;
    }
    return `category_${code}_${userId}`;
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

  async getOrCreateBalanceAdjustmentCategory(
    userId: string,
    type: 'income' | 'expense',
  ): Promise<string> {
    const categoryType = type === 'income' ? 'income' : 'expense';
    const categoryName = CATEGORY_NAME.BALANCE_ADJUSTMENT;
    const categoryId = this.getCategoryId(userId, categoryName, categoryType);

    const existingCategory = await this.deps.repository.findById(categoryId);
    if (existingCategory) {
      return existingCategory.id;
    }

    const newCategory = await this.deps.repository.create({
      id: categoryId,
      userId,
      name: categoryName,
      type: categoryType,
      parentId: null,
      isLocked: true,
    });
    return newCategory.id;
  }
  // #endregion

  // #region BaseService Implementation
  protected formatEntity(category: CategoryRecord): CategoryResponse {
    return {
      ...category,
      parentId: category.parentId ?? null,
      icon: category.icon ?? null,
      color: category.color ?? null,
    };
  }

  async list(
    userId: string,
    query: IListCategoriesQueryDto = {},
  ): Promise<CategoryListResponse> {
    const { type } = query;
    const categories = await this.deps.repository.findAllByUserIdForTree(
      userId,
      type,
    );
    const tree = this.buildCategoryTree(categories as CategoryWithChildren[]);
    return { categories: tree.map((c) => this.formatCategoryTree(c)) };
  }

  async upsert(
    userId: string,
    data: IUpsertCategoryDto & { id?: string },
  ): Promise<CategoryResponse> {
    const { id, ...rest } = data;

    if (id) {
      const category = await this.deps.repository.findByIdAndUserId(id, userId);
      if (!category) {
        throwAppError(ErrorCode.CATEGORY_NOT_FOUND, 'Category not found');
      }
      if (category.isLocked) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot update locked category',
        );
      }
    }

    if (rest.parentId) {
      const parent = await this.deps.repository.findByIdAndUserId(
        rest.parentId,
        userId,
      );
      if (!parent) {
        throwAppError(
          ErrorCode.CATEGORY_NOT_FOUND,
          'Parent category not found',
        );
      }
      if (parent.isLocked) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot create child of locked category',
        );
      }
      if (parent.type !== rest.type) {
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
      if (id && rest.parentId === id) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Category cannot be its own parent',
        );
      }
      if (id) {
        const hasCircularReference = await this.checkCircularReference(
          id,
          rest.parentId,
        );
        if (hasCircularReference) {
          throwAppError(
            ErrorCode.VALIDATION_ERROR,
            'Circular reference detected',
          );
        }
      }
    }

    const payload = {
      name: rest.name,
      type: rest.type,
      parentId: rest.parentId ?? null,
      icon: rest.icon ?? null,
      color: rest.color ?? null,
    };

    if (id) {
      const updatedCategory = await this.deps.repository.update(id, payload);
      return this.formatEntity(updatedCategory);
    }

    const newCategory = await this.deps.repository.create({
      ...payload,
      id: this.getCategoryId(userId, data.name),
      userId,
    });
    return this.formatEntity(newCategory);
  }

  protected async validateBeforeDelete(
    categories: CategoryRecord[],
  ): Promise<void> {
    for (const category of categories) {
      if (category.isLocked) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          `Cannot delete locked category: ${category.name}`,
        );
      }

      const childrenCount = await this.deps.repository.countChildren(
        category.id,
      );
      if (childrenCount > 0) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          `Cannot delete category with children: ${category.name}`,
        );
      }
    }
  }
  // #endregion

  // #region Private Helpers
  private flattenCategories(
    categories: CategorySeedData[],
    parentName?: string,
  ): Array<{ name: string; type: string; parentName?: string }> {
    const result: Array<{ name: string; type: string; parentName?: string }> =
      [];
    for (const category of categories) {
      result.push({ name: category.name, type: category.type, parentName });
      if (category.children && category.children.length > 0) {
        result.push(
          ...this.flattenCategories(category.children, category.name),
        );
      }
    }
    return result;
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
          parent.children?.push(categoryWithChildren);
        }
      }
    }
    return rootCategories;
  }

  private formatCategoryTree(
    category: CategoryWithChildren,
  ): CategoryTreeResponse {
    const children =
      category.children && category.children.length > 0
        ? category.children.map((c) => this.formatCategoryTree(c))
        : undefined;

    return {
      ...this.formatEntity(category),
      children,
    };
  }

  private async checkCircularReference(
    categoryId: string,
    potentialParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = potentialParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) return true;
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const category = await this.deps.repository.findById(currentId);
      currentId = category?.parentId ?? null;
    }
    return false;
  }
  // #endregion

  // #region Legacy Methods for Backward Compatibility
  async getAllCategories(
    userId: string,
    query: IListCategoriesQueryDto = {},
  ): Promise<CategoryListResponse> {
    return this.list(userId, query);
  }

  async createCategory(
    userId: string,
    data: IUpsertCategoryDto,
  ): Promise<CategoryResponse> {
    return this.upsert(userId, data);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    data: IUpsertCategoryDto,
  ): Promise<CategoryResponse> {
    return this.upsert(userId, { ...data, id: categoryId });
  }

  async deleteManyCategories(userId: string, ids: string[]) {
    return this.deleteMany(userId, ids);
  }
  // #endregion
}

export const categoryService = new CategoryService();
