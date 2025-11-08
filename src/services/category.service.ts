import { CategoryType } from '@server/generated/prisma/enums';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';

export class CategoryService {
  async seedDefaultCategories(userId: string): Promise<void> {
    const loanCategories = [
      { name: 'Đi vay', type: CategoryType.loan },
      { name: 'Cho vay', type: CategoryType.loan },
      { name: 'Trả nợ', type: CategoryType.loan },
      { name: 'Thu nợ', type: CategoryType.loan },
    ];

    const transferCategory = {
      name: 'Chuyển khoản',
      type: CategoryType.transfer,
    };

    const investmentCategory = {
      name: 'Đầu tư',
      type: CategoryType.investment,
    };

    const expenseParent = {
      name: 'Chi',
      type: CategoryType.expense,
    };

    const expenseChildren = [
      'Ăn uống',
      'Nhà ở',
      'Giao thông',
      'Giải trí',
      'Y tế',
      'Giáo dục',
      'Mua sắm',
      'Khác',
    ];

    const incomeParent = {
      name: 'Thu',
      type: CategoryType.income,
    };

    const incomeChildren = ['Lương', 'Thưởng', 'Đầu tư', 'Kinh doanh', 'Khác'];

    await prisma.$transaction(async (tx) => {
      for (const category of loanCategories) {
        await tx.category.create({
          data: {
            userId,
            name: category.name,
            type: category.type,
            isLocked: true,
          },
        });
      }

      await tx.category.create({
        data: {
          userId,
          name: transferCategory.name,
          type: transferCategory.type,
          isLocked: true,
        },
      });

      await tx.category.create({
        data: {
          userId,
          name: investmentCategory.name,
          type: investmentCategory.type,
          isLocked: true,
        },
      });

      const expenseParentCategory = await tx.category.create({
        data: {
          userId,
          name: expenseParent.name,
          type: expenseParent.type,
          isLocked: true,
        },
      });

      for (const childName of expenseChildren) {
        await tx.category.create({
          data: {
            userId,
            name: childName,
            type: CategoryType.expense,
            parentId: expenseParentCategory.id,
            isLocked: true,
          },
        });
      }

      const incomeParentCategory = await tx.category.create({
        data: {
          userId,
          name: incomeParent.name,
          type: incomeParent.type,
          isLocked: true,
        },
      });

      for (const childName of incomeChildren) {
        await tx.category.create({
          data: {
            userId,
            name: childName,
            type: CategoryType.income,
            parentId: incomeParentCategory.id,
            isLocked: true,
          },
        });
      }
    });
  }
}

export default new Elysia().decorate('categoryService', new CategoryService());
