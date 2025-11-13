import type { Prisma } from '@server/generated/prisma/client';
import { BudgetPeriod, TransactionType } from '@server/generated/prisma/enums';
import type {
  BudgetOrderByWithRelationInput,
  BudgetWhereInput,
} from '@server/generated/prisma/models/Budget';
import { prisma } from '@server/libs/db';
import Decimal from 'decimal.js';
import { Elysia } from 'elysia';
import { ErrorCode, throwAppError } from '../constants/error';
import type {
  IBudgetPeriodQueryDto,
  IListBudgetsQueryDto,
  IUpsertBudgetDto,
} from '../dto/budget.dto';
import {
  dateToIsoString,
  dateToNullableIsoString,
  decimalToString,
} from '../utils/formatters';
import { currencyConversionServiceInstance } from './currency-conversion.service';

const BUDGET_SELECT_FULL = {
  id: true,
  userId: true,
  name: true,
  amount: true,
  period: true,
  startDate: true,
  endDate: true,
  carryOver: true,
  createdAt: true,
  updatedAt: true,
  categories: {
    select: {
      categoryId: true,
    },
  },
  accounts: {
    select: {
      accountId: true,
    },
  },
} as const;

const BUDGET_SELECT_MINIMAL = {
  id: true,
  userId: true,
  amount: true,
  period: true,
  startDate: true,
  endDate: true,
  carryOver: true,
} as const;

type BudgetRecord = Prisma.BudgetGetPayload<{
  select: typeof BUDGET_SELECT_FULL;
}>;

const mapBudget = (budget: BudgetRecord, baseCurrencyId: string) => ({
  id: budget.id,
  name: budget.name,
  amount: decimalToString(budget.amount),
  period: budget.period,
  startDate: dateToIsoString(budget.startDate),
  endDate: dateToNullableIsoString(budget.endDate),
  carryOver: budget.carryOver,
  accountIds: budget.accounts.map((a) => a.accountId),
  categoryIds: budget.categories.map((c) => c.categoryId),
  createdAt: dateToIsoString(budget.createdAt),
  updatedAt: dateToIsoString(budget.updatedAt),
});

export class BudgetService {
  private async getUserBaseCurrencyId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { baseCurrencyId: true },
    });
    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }
    return user.baseCurrencyId;
  }

  private async validateBudgetOwnership(userId: string, budgetId: string) {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
        deletedAt: null,
      },
      select: BUDGET_SELECT_MINIMAL,
    });
    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }
    return budget;
  }

  private async validateAccountsAndCategories(
    userId: string,
    accountIds: string[],
    categoryIds: string[],
  ) {
    const [accounts, categories] = await Promise.all([
      prisma.account.findMany({
        where: {
          id: { in: accountIds },
          userId,
          deletedAt: null,
        },
        select: { id: true },
      }),
      prisma.category.findMany({
        where: {
          id: { in: categoryIds },
          userId,
          deletedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (accounts.length !== accountIds.length) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Some accounts not found');
    }
    if (categories.length !== categoryIds.length) {
      throwAppError(ErrorCode.CATEGORY_NOT_FOUND, 'Some categories not found');
    }
  }

  private calculateNextPeriodStart(
    period: BudgetPeriod,
    currentStart: Date,
  ): Date {
    const next = new Date(currentStart);
    switch (period) {
      case BudgetPeriod.daily:
        next.setDate(next.getDate() + 1);
        break;
      case BudgetPeriod.monthly:
        next.setMonth(next.getMonth() + 1);
        break;
      case BudgetPeriod.quarterly:
        next.setMonth(next.getMonth() + 3);
        break;
      case BudgetPeriod.yearly:
        next.setFullYear(next.getFullYear() + 1);
        break;
      case BudgetPeriod.none:
        throw new Error('Cannot calculate next period for none period type');
    }
    return next;
  }

  private calculatePeriodEnd(period: BudgetPeriod, periodStart: Date): Date {
    const end = new Date(periodStart);
    switch (period) {
      case BudgetPeriod.daily:
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.monthly:
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.quarterly:
        end.setMonth(end.getMonth() + 3);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.yearly:
        end.setFullYear(end.getFullYear() + 1);
        end.setMonth(0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.none:
        throw new Error('Cannot calculate period end for none period type');
    }
    return end;
  }

  async calculatePeriodSpending(
    userId: string,
    budgetId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Decimal> {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
        deletedAt: null,
      },
      select: {
        accounts: { select: { accountId: true } },
        categories: { select: { categoryId: true } },
      },
    });

    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }

    const accountIds = budget.accounts.map((a) => a.accountId);
    const categoryIds = budget.categories.map((c) => c.categoryId);
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        type: TransactionType.expense,
        accountId: { in: accountIds },
        categoryId: { in: categoryIds },
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        amount: true,
        currencyId: true,
        priceInBaseCurrency: true,
        fee: true,
        feeInBaseCurrency: true,
      },
    });

    let totalSpent = new Decimal(0);

    for (const transaction of transactions) {
      let amountInBase: Decimal;
      if (transaction.currencyId === baseCurrencyId) {
        amountInBase = new Decimal(transaction.amount);
      } else if (transaction.priceInBaseCurrency !== null) {
        amountInBase = new Decimal(transaction.priceInBaseCurrency);
      } else {
        amountInBase =
          await currencyConversionServiceInstance.convertToBaseCurrency(
            transaction.amount,
            transaction.currencyId,
            baseCurrencyId,
          );
      }

      let feeInBase: Decimal = new Decimal(0);
      if (transaction.fee > 0) {
        if (transaction.currencyId === baseCurrencyId) {
          feeInBase = new Decimal(transaction.fee);
        } else if (transaction.feeInBaseCurrency !== null) {
          feeInBase = new Decimal(transaction.feeInBaseCurrency);
        } else {
          feeInBase =
            await currencyConversionServiceInstance.convertToBaseCurrency(
              transaction.fee,
              transaction.currencyId,
              baseCurrencyId,
            );
        }
      }

      totalSpent = totalSpent.add(amountInBase).add(feeInBase);
    }

    return totalSpent;
  }

  async getCarryOverAmount(
    userId: string,
    budgetId: string,
    previousPeriodEnd: Date,
  ): Promise<Decimal> {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
        deletedAt: null,
      },
      select: BUDGET_SELECT_MINIMAL,
    });

    if (!budget || !budget.carryOver) {
      return new Decimal(0);
    }

    const previousPeriodStart = this.calculatePeriodStart(
      budget.period,
      previousPeriodEnd,
    );
    const previousPeriodEndDate = new Date(previousPeriodEnd);
    previousPeriodEndDate.setHours(23, 59, 59, 999);

    const spent = await this.calculatePeriodSpending(
      userId,
      budgetId,
      previousPeriodStart,
      previousPeriodEndDate,
    );

    const budgetAmount = new Decimal(budget.amount);
    const remaining = budgetAmount.sub(spent);

    if (remaining.gt(0)) {
      return remaining;
    }

    return new Decimal(0);
  }

  private calculatePeriodStart(period: BudgetPeriod, periodEnd: Date): Date {
    const start = new Date(periodEnd);
    switch (period) {
      case BudgetPeriod.daily:
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.monthly:
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.quarterly:
        start.setMonth(start.getMonth() - 3);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.yearly:
        start.setFullYear(start.getFullYear() - 1);
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.none:
        throw new Error('Cannot calculate period start for none period type');
    }
    return start;
  }

  async upsertBudget(userId: string, data: IUpsertBudgetDto) {
    if (data.id) {
      await this.validateBudgetOwnership(userId, data.id);
    }

    await this.validateAccountsAndCategories(
      userId,
      data.accountIds,
      data.categoryIds,
    );

    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);

    if (data.id) {
      const budget = await prisma.budget.update({
        where: { id: data.id },
        data: {
          name: data.name,
          amount: data.amount,
          period: data.period,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          carryOver: data.carryOver,
          categories: {
            deleteMany: {},
            create: data.categoryIds.map((categoryId) => ({
              categoryId,
            })),
          },
          accounts: {
            deleteMany: {},
            create: data.accountIds.map((accountId) => ({
              accountId,
            })),
          },
        },
        select: BUDGET_SELECT_FULL,
      });
      return mapBudget(budget, baseCurrencyId);
    } else {
      const budget = await prisma.budget.create({
        data: {
          userId,
          name: data.name,
          amount: data.amount,
          period: data.period,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          carryOver: data.carryOver,
          categories: {
            create: data.categoryIds.map((categoryId) => ({
              categoryId,
            })),
          },
          accounts: {
            create: data.accountIds.map((accountId) => ({
              accountId,
            })),
          },
        },
        select: BUDGET_SELECT_FULL,
      });
      return mapBudget(budget, baseCurrencyId);
    }
  }

  async getBudget(userId: string, budgetId: string) {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
        deletedAt: null,
      },
      select: BUDGET_SELECT_FULL,
    });

    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }

    return mapBudget(budget, baseCurrencyId);
  }

  async listBudgets(userId: string, query: IListBudgetsQueryDto = {}) {
    const {
      period,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: BudgetWhereInput = {
      userId,
      deletedAt: null,
    };

    if (period && period.length > 0) {
      where.period = { in: period };
    }

    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const orderBy: BudgetOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'amount') {
      orderBy.amount = sortOrder;
    } else if (sortBy === 'period') {
      orderBy.period = sortOrder;
    } else if (sortBy === 'startDate') {
      orderBy.startDate = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    }

    const skip = (page - 1) * limit;
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);

    const [budgets, total] = await Promise.all([
      prisma.budget.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: BUDGET_SELECT_FULL,
      }),
      prisma.budget.count({ where }),
    ]);

    return {
      budgets: budgets.map((budget) => mapBudget(budget, baseCurrencyId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteBudget(userId: string, budgetId: string) {
    await this.validateBudgetOwnership(userId, budgetId);

    await prisma.budget.update({
      where: { id: budgetId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Budget deleted successfully' };
  }

  async getBudgetPeriods(
    userId: string,
    budgetId: string,
    query: IBudgetPeriodQueryDto = {},
  ) {
    await this.validateBudgetOwnership(userId, budgetId);

    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
        deletedAt: null,
      },
      select: BUDGET_SELECT_MINIMAL,
    });

    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }

    if (budget.period === BudgetPeriod.none) {
      return { periods: [] };
    }

    const now = new Date();
    const endDate = budget.endDate ? new Date(budget.endDate) : now;
    const queryEndDate = query.endDate ? new Date(query.endDate) : endDate;
    const actualEndDate = queryEndDate < endDate ? queryEndDate : endDate;

    const queryStartDate = query.startDate
      ? new Date(query.startDate)
      : budget.startDate;
    const actualStartDate =
      queryStartDate > budget.startDate ? queryStartDate : budget.startDate;

    const periods: Array<{
      id: string;
      budgetId: string;
      periodStartDate: string;
      periodEndDate: string;
      carriedOverAmount: string;
      budgetAmount: string;
      totalAmount: string;
      spentAmount: string;
      remainingAmount: string;
      isOverBudget: boolean;
      createdAt: string;
      updatedAt: string;
    }> = [];

    let currentStart = new Date(actualStartDate);
    currentStart.setHours(0, 0, 0, 0);

    while (currentStart <= actualEndDate) {
      const periodEnd = this.calculatePeriodEnd(budget.period, currentStart);
      const periodEndDate =
        periodEnd < actualEndDate ? periodEnd : actualEndDate;

      let existingPeriod = await prisma.budgetPeriodRecord.findUnique({
        where: {
          budgetId_periodStartDate: {
            budgetId,
            periodStartDate: currentStart,
          },
        },
      });

      let carriedOverAmount = new Decimal(0);
      if (existingPeriod) {
        carriedOverAmount = new Decimal(existingPeriod.carriedOverAmount);
      } else if (currentStart > budget.startDate) {
        const previousPeriodEnd = new Date(currentStart);
        previousPeriodEnd.setMilliseconds(
          previousPeriodEnd.getMilliseconds() - 1,
        );
        carriedOverAmount = await this.getCarryOverAmount(
          userId,
          budgetId,
          previousPeriodEnd,
        );

        existingPeriod = await prisma.budgetPeriodRecord.create({
          data: {
            budgetId,
            periodStartDate: currentStart,
            periodEndDate,
            carriedOverAmount: carriedOverAmount.toNumber(),
          },
        });
      }

      const spent = await this.calculatePeriodSpending(
        userId,
        budgetId,
        currentStart,
        periodEndDate,
      );

      const budgetAmount = new Decimal(budget.amount);
      const totalAmount = budgetAmount.add(carriedOverAmount);
      const remaining = totalAmount.sub(spent);
      const isOverBudget = spent.gt(totalAmount);

      periods.push({
        id: existingPeriod ? existingPeriod.id : '',
        budgetId,
        periodStartDate: dateToIsoString(currentStart),
        periodEndDate: dateToIsoString(periodEndDate),
        carriedOverAmount: decimalToString(carriedOverAmount),
        budgetAmount: decimalToString(budgetAmount),
        totalAmount: decimalToString(totalAmount),
        spentAmount: decimalToString(spent),
        remainingAmount: decimalToString(remaining),
        isOverBudget,
        createdAt: existingPeriod
          ? dateToIsoString(existingPeriod.createdAt)
          : dateToIsoString(new Date()),
        updatedAt: existingPeriod
          ? dateToIsoString(existingPeriod.updatedAt)
          : dateToIsoString(new Date()),
      });

      currentStart = this.calculateNextPeriodStart(budget.period, currentStart);
    }

    return { periods };
  }

  async getBudgetPeriodDetail(
    userId: string,
    budgetId: string,
    periodId: string,
  ) {
    await this.validateBudgetOwnership(userId, budgetId);

    const period = await prisma.budgetPeriodRecord.findFirst({
      where: {
        id: periodId,
        budgetId,
      },
    });

    if (!period) {
      throwAppError(
        ErrorCode.BUDGET_PERIOD_NOT_FOUND,
        'Budget period not found',
      );
    }

    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
        deletedAt: null,
      },
      select: BUDGET_SELECT_MINIMAL,
    });

    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }

    const spent = await this.calculatePeriodSpending(
      userId,
      budgetId,
      period.periodStartDate,
      period.periodEndDate,
    );

    const budgetAmount = new Decimal(budget.amount);
    const carriedOverAmount = new Decimal(period.carriedOverAmount);
    const totalAmount = budgetAmount.add(carriedOverAmount);
    const remaining = totalAmount.sub(spent);
    const isOverBudget = spent.gt(totalAmount);

    return {
      id: period.id,
      budgetId: period.budgetId,
      periodStartDate: dateToIsoString(period.periodStartDate),
      periodEndDate: dateToIsoString(period.periodEndDate),
      carriedOverAmount: decimalToString(carriedOverAmount),
      budgetAmount: decimalToString(budgetAmount),
      totalAmount: decimalToString(totalAmount),
      spentAmount: decimalToString(spent),
      remainingAmount: decimalToString(remaining),
      isOverBudget,
      createdAt: dateToIsoString(period.createdAt),
      updatedAt: dateToIsoString(period.updatedAt),
    };
  }
}

export default new Elysia().decorate('budgetService', new BudgetService());
