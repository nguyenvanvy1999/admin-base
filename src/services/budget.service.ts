import { prisma } from '@server/configs/db';
import type {
  BudgetOrderByWithRelationInput,
  BudgetWhereInput,
} from '@server/generated';
import { BudgetPeriod, TransactionType } from '@server/generated';
import {
  DB_PREFIX,
  dateToIsoString,
  decimalToString,
  ErrorCode,
  idUtil,
  throwAppError,
} from '@server/share';
import { deleteManyResources } from '@server/share/utils/delete-many.util';
import { calculatePagination } from '@server/share/utils/pagination.util';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import type {
  IBudgetPeriodQueryDto,
  IListBudgetsQueryDto,
  IUpsertBudgetDto,
} from '../dto/budget.dto';
import { BaseService } from './base/base.service';
import type { BaseServiceDependencies } from './base/service-dependencies';
import {
  type CurrencyConversionService,
  currencyConversionService,
} from './currency-conversion.service';
import { mapBudget } from './mappers';

import { BUDGET_SELECT_FULL, BUDGET_SELECT_MINIMAL } from './selects';

interface BudgetServiceDependencies extends BaseServiceDependencies {
  currencyConversionService: CurrencyConversionService;
}

export class BudgetService extends BaseService {
  private readonly currencyConversionService: CurrencyConversionService;

  constructor(
    deps: BudgetServiceDependencies = {
      db: prisma,
      idUtil,
      currencyConversionService: currencyConversionService,
    },
  ) {
    super(deps);
    this.currencyConversionService = deps.currencyConversionService;
  }

  private async getUserBaseCurrencyId(userId: string): Promise<string> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { baseCurrencyId: true },
    });
    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }
    return user.baseCurrencyId;
  }

  private async validateAccountsAndCategories(
    userId: string,
    accountIds: string[],
    categoryIds: string[],
  ) {
    const [accounts, categories] = await Promise.all([
      this.db.account.findMany({
        where: {
          id: { in: accountIds },
          userId,
        },
        select: { id: true },
      }),
      this.db.category.findMany({
        where: {
          id: { in: categoryIds },
          userId,
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
    const next = dayjs(currentStart);
    switch (period) {
      case BudgetPeriod.daily:
        return next.add(1, 'day').toDate();
      case BudgetPeriod.monthly:
        return next.add(1, 'month').toDate();
      case BudgetPeriod.quarterly:
        return next.add(3, 'month').toDate();
      case BudgetPeriod.yearly:
        return next.add(1, 'year').toDate();
      case BudgetPeriod.none:
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot calculate next period for none period type',
        );
    }
  }

  private calculatePeriodEnd(period: BudgetPeriod, periodStart: Date): Date {
    const end = dayjs(periodStart);
    switch (period) {
      case BudgetPeriod.daily:
        return end.endOf('day').toDate();
      case BudgetPeriod.monthly:
        return end.add(1, 'month').subtract(1, 'day').endOf('day').toDate();
      case BudgetPeriod.quarterly:
        return end.add(3, 'month').subtract(1, 'day').endOf('day').toDate();
      case BudgetPeriod.yearly:
        return end.add(1, 'year').subtract(1, 'day').endOf('day').toDate();
      case BudgetPeriod.none:
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot calculate period end for none period type',
        );
    }
  }

  async calculatePeriodSpending(
    userId: string,
    budgetId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Decimal> {
    const budget = await this.db.budget.findFirst({
      where: {
        id: budgetId,
        userId,
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

    const transactions = await this.db.transaction.findMany({
      where: {
        userId,

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
          await this.currencyConversionService.convertToBaseCurrency(
            transaction.amount,
            transaction.currencyId,
            baseCurrencyId,
          );
      }

      let feeInBase: Decimal = new Decimal(0);
      const feeDecimal = new Decimal(transaction.fee);
      if (feeDecimal.gt(0)) {
        if (transaction.currencyId === baseCurrencyId) {
          feeInBase = new Decimal(transaction.fee);
        } else if (transaction.feeInBaseCurrency !== null) {
          feeInBase = new Decimal(transaction.feeInBaseCurrency);
        } else {
          feeInBase =
            await this.currencyConversionService.convertToBaseCurrency(
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
    const budget = await this.db.budget.findFirst({
      where: {
        id: budgetId,
        userId,
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
    const previousPeriodEndDate = dayjs(previousPeriodEnd)
      .endOf('day')
      .toDate();

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
    const start = dayjs(periodEnd);
    switch (period) {
      case BudgetPeriod.daily:
        return start.startOf('day').toDate();
      case BudgetPeriod.monthly:
        return start.subtract(1, 'month').startOf('month').toDate();
      case BudgetPeriod.quarterly:
        return start.subtract(3, 'month').startOf('month').toDate();
      case BudgetPeriod.yearly:
        return start.subtract(1, 'year').startOf('year').toDate();
      case BudgetPeriod.none:
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot calculate period start for none period type',
        );
    }
  }

  async upsertBudget(userId: string, data: IUpsertBudgetDto) {
    if (data.id) {
      this.validateOwnership(
        userId,
        data.id,
        ErrorCode.BUDGET_NOT_FOUND,
        'Budget not found',
      );
    }

    await this.validateAccountsAndCategories(
      userId,
      data.accountIds,
      data.categoryIds,
    );

    if (data.id) {
      const budget = await this.db.budget.update({
        where: { id: data.id },
        data: {
          name: data.name,
          amount: data.amount,
          period: data.period,
          startDate: dayjs(data.startDate).toDate(),
          endDate: data.endDate ? dayjs(data.endDate).toDate() : null,
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
      return mapBudget(budget);
    } else {
      const budget = await this.db.budget.create({
        data: {
          id: this.idUtil.dbIdWithUserId(DB_PREFIX.BUDGET, userId),
          userId,
          name: data.name,
          amount: data.amount,
          period: data.period,
          startDate: dayjs(data.startDate).toDate(),
          endDate: data.endDate ? dayjs(data.endDate).toDate() : null,
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
      return mapBudget(budget);
    }
  }

  async getBudget(userId: string, budgetId: string) {
    const budget = await this.db.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      select: BUDGET_SELECT_FULL,
    });

    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }

    return mapBudget(budget);
  }

  async listBudgets(userId: string, query: IListBudgetsQueryDto) {
    const {
      period,
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: BudgetWhereInput = {
      userId,
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
    const orderByResult = this.buildOrderBy(sortBy, sortOrder, {
      name: 'name',
      amount: 'amount',
      period: 'period',
      startDate: 'startDate',
      created: 'created',
    });
    if (orderByResult) {
      Object.assign(orderBy, orderByResult);
    }

    const { skip, take } = calculatePagination(page, limit);

    const [budgets, total] = await Promise.all([
      this.db.budget.findMany({
        where,
        orderBy,
        skip,
        take,
        select: BUDGET_SELECT_FULL,
      }),
      this.db.budget.count({ where }),
    ]);

    return {
      budgets: budgets.map((budget) => mapBudget(budget)),
      pagination: this.buildPaginationResponse(page, limit, total, [])
        .pagination,
    };
  }

  async deleteManyBudgets(userId: string, ids: string[]) {
    return await deleteManyResources({
      db: this.db,
      model: 'budget',
      userId,
      ids,
      selectMinimal: BUDGET_SELECT_MINIMAL,
      errorCode: ErrorCode.BUDGET_NOT_FOUND,
      errorMessage: 'Some budgets were not found or do not belong to you',
      resourceName: 'budget',
    });
  }

  async getBudgetPeriods(
    userId: string,
    budgetId: string,
    query: IBudgetPeriodQueryDto = {},
  ) {
    this.validateOwnership(
      userId,
      budgetId,
      ErrorCode.BUDGET_NOT_FOUND,
      'Budget not found',
    );

    const budget = await this.db.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      select: BUDGET_SELECT_MINIMAL,
    });

    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }

    if (budget.period === BudgetPeriod.none) {
      return { periods: [] };
    }

    const now = dayjs().toDate();
    const endDate = budget.endDate ? dayjs(budget.endDate).toDate() : now;
    const queryEndDate = query.endDate
      ? dayjs(query.endDate).toDate()
      : endDate;
    const actualEndDate = queryEndDate < endDate ? queryEndDate : endDate;

    const queryStartDate = query.startDate
      ? dayjs(query.startDate).toDate()
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
      created: string;
      modified: string;
    }> = [];

    let currentStart = dayjs(actualStartDate).startOf('day').toDate();

    while (currentStart <= actualEndDate) {
      const periodEnd = this.calculatePeriodEnd(budget.period, currentStart);
      const periodEndDate =
        periodEnd < actualEndDate ? periodEnd : actualEndDate;

      let existingPeriod = await this.db.budgetPeriodRecord.findUnique({
        where: {
          budget_period_unique: {
            budgetId,
            periodStartDate: currentStart,
          },
        },
      });

      let carriedOverAmount = new Decimal(0);
      if (existingPeriod) {
        carriedOverAmount = new Decimal(existingPeriod.carriedOverAmount);
      } else {
        if (currentStart > budget.startDate) {
          const previousPeriodEnd = dayjs(currentStart)
            .subtract(1, 'millisecond')
            .toDate();
          carriedOverAmount = await this.getCarryOverAmount(
            userId,
            budgetId,
            previousPeriodEnd,
          );
        }

        // Always create a period record if it doesn't exist
        existingPeriod = await this.db.budgetPeriodRecord.create({
          data: {
            id: this.idUtil.dbIdWithUserId(DB_PREFIX.BUDGET_PERIOD, userId),
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
        id: existingPeriod.id,
        budgetId,
        periodStartDate: dateToIsoString(currentStart),
        periodEndDate: dateToIsoString(periodEndDate),
        carriedOverAmount: decimalToString(carriedOverAmount),
        budgetAmount: decimalToString(budgetAmount),
        totalAmount: decimalToString(totalAmount),
        spentAmount: decimalToString(spent),
        remainingAmount: decimalToString(remaining),
        isOverBudget,
        created: dateToIsoString(existingPeriod.created),
        modified: dateToIsoString(existingPeriod.modified),
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
    this.validateOwnership(
      userId,
      budgetId,
      ErrorCode.BUDGET_NOT_FOUND,
      'Budget not found',
    );

    const period = await this.db.budgetPeriodRecord.findFirst({
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

    const budget = await this.db.budget.findFirst({
      where: {
        id: budgetId,
        userId,
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
      created: dateToIsoString(period.created),
      modified: dateToIsoString(period.modified),
    };
  }
}

export const budgetService = new BudgetService();
