import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import {
  type CategorySeedData,
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORY,
  LOAN_CATEGORIES,
  TRANSFER_CATEGORY,
} from '../constants/category';

export class CategoryService {
  private async createCategory(
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
        await this.createCategory(tx, userId, child, category.id);
      }
    }

    return category.id;
  }

  async seedDefaultCategories(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const category of LOAN_CATEGORIES) {
        await this.createCategory(tx, userId, category);
      }

      await this.createCategory(tx, userId, TRANSFER_CATEGORY);
      await this.createCategory(tx, userId, INVESTMENT_CATEGORY);

      for (const category of EXPENSE_CATEGORIES) {
        await this.createCategory(tx, userId, category);
      }
    });
  }
}

export default new Elysia().decorate('categoryService', new CategoryService());
