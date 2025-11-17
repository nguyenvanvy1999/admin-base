import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  BudgetOrderByWithRelationInput,
  BudgetWhereInput,
  Prisma,
} from '@server/generated';
import { BudgetPeriod, TransactionType } from '@server/generated';
import {
  type BudgetRepository,
  budgetRepository,
} from '@server/repositories/budget.repository';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import {
  dateFormatter,
  decimalFormatter,
} from '@server/share/utils/service.util';
import Decimal from 'decimal.js';
import type {
  BudgetListResponse,
  BudgetPeriodDetailResponse,
  BudgetPeriodListResponse,
  BudgetResponse,
  IBudgetPeriodQueryDto,
  IListBudgetsQueryDto,
  IUpsertBudgetDto,
} from '../dto/budget.dto';
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
import {
  type CurrencyConversionService,
  currencyConversionService,
} from './currency-conversion.service';
import type { BUDGET_SELECT_FULL } from './selects';

type BudgetRecord = Prisma.BudgetGetPayload<{
  select: typeof BUDGET_SELECT_FULL;
}>;

export class BudgetService extends BaseService<
  BudgetRecord,
  IUpsertBudgetDto,
  BudgetResponse,
  BudgetListResponse,
  BudgetRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: BudgetRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
      currencyConversionService: CurrencyConversionService;
    } = {
      db: prisma,
      repository: budgetRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
      currencyConversionService: currencyConversionService,
    },
  ) {
    super(deps, {
      entityName: 'Budget',
      dbPrefix: DB_PREFIX.BUDGET,
    });
  }

  // #region BaseService Implementation
  protected formatEntity(budget: BudgetRecord): BudgetResponse {
    return {
      id: budget.id,
      name: budget.name,
      amount: decimalFormatter.toString(budget.amount),
      period: budget.period,
      startDate: dateFormatter.toIsoStringRequired(budget.startDate),
      endDate: dateFormatter.toIsoString(budget.endDate),
      carryOver: budget.carryOver,
      accountIds: budget.accounts.map((a) => a.accountId),
      categoryIds: budget.categories.map((c) => c.categoryId),
      created: dateFormatter.toIsoStringRequired(budget.created),
      modified: dateFormatter.toIsoStringRequired(budget.modified),
    };
  }

  async upsert(
    userId: string,
    data: IUpsertBudgetDto,
  ): Promise<BudgetResponse> {
    if (data.id) {
      await this.validateOwnership(userId, data.id);
    }

    await this.validateAccountsAndCategories(
      userId,
      data.accountIds,
      data.categoryIds,
    );

    const payload = {
      name: data.name,
      amount: data.amount,
      period: data.period,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      carryOver: data.carryOver,
      categories: {
        deleteMany: {},
        create: data.categoryIds.map((categoryId) => ({ categoryId })),
      },
      accounts: {
        deleteMany: {},
        create: data.accountIds.map((accountId) => ({ accountId })),
      },
    };

    if (data.id) {
      const budget = await this.deps.repository.update(data.id, payload);
      return this.formatEntity(budget);
    }

    const budget = await this.deps.repository.create({
      ...payload,
      id: this.deps.idUtil.dbId(this.config.dbPrefix),
      userId,
    });
    return this.formatEntity(budget);
  }

  async list(
    userId: string,
    query: IListBudgetsQueryDto,
  ): Promise<BudgetListResponse> {
    const {
      period,
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: BudgetWhereInput = { userId };
    if (period?.length) where.period = { in: period };
    if (search?.trim())
      where.name = { contains: search.trim(), mode: 'insensitive' };

    const orderBy: BudgetOrderByWithRelationInput = { [sortBy]: sortOrder };
    const skip = this.calculateSkip(page, limit);

    const [budgets, total] = await Promise.all([
      this.deps.repository.findManyByUserId(
        userId,
        where,
        orderBy,
        skip,
        limit,
      ),
      this.deps.repository.countByUserId(userId, where),
    ]);

    return {
      budgets: budgets.map((b) => this.formatEntity(b)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }
  // #endregion

  // #region Specific Public Methods
  async getBudget(userId: string, budgetId: string): Promise<BudgetResponse> {
    const budget = await this.deps.repository.findByIdAndUserId(
      budgetId,
      userId,
    );
    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }
    return this.formatEntity(budget);
  }

  async getBudgetPeriods(
    userId: string,
    budgetId: string,
    query: IBudgetPeriodQueryDto = {},
  ): Promise<BudgetPeriodListResponse> {
    const budget = await this.deps.repository.findByIdAndUserId(
      budgetId,
      userId,
    );
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

    const periods = [];
    let currentStart = new Date(actualStartDate);
    currentStart.setHours(0, 0, 0, 0);

    while (currentStart <= actualEndDate) {
      const periodEnd = this.calculatePeriodEnd(budget.period, currentStart);
      const periodEndDate =
        periodEnd < actualEndDate ? periodEnd : actualEndDate;

      let existingPeriod = await this.deps.db.budgetPeriodRecord.findUnique({
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
          const previousPeriodEnd = new Date(currentStart);
          previousPeriodEnd.setMilliseconds(-1);
          carriedOverAmount = await this.getCarryOverAmount(
            userId,
            budgetId,
            previousPeriodEnd,
          );
        }

        existingPeriod = await this.deps.db.budgetPeriodRecord.create({
          data: {
            id: this.deps.idUtil.dbId(DB_PREFIX.BUDGET_PERIOD),
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

      periods.push({
        id: existingPeriod.id,
        budgetId,
        periodStartDate: dateFormatter.toIsoStringRequired(currentStart),
        periodEndDate: dateFormatter.toIsoStringRequired(periodEndDate),
        carriedOverAmount: decimalFormatter.toString(carriedOverAmount),
        budgetAmount: decimalFormatter.toString(budgetAmount),
        totalAmount: decimalFormatter.toString(totalAmount),
        spentAmount: decimalFormatter.toString(spent),
        remainingAmount: decimalFormatter.toString(remaining),
        isOverBudget: spent.gt(totalAmount),
        created: dateFormatter.toIsoStringRequired(existingPeriod.created),
        modified: dateFormatter.toIsoStringRequired(existingPeriod.modified),
      });

      currentStart = this.calculateNextPeriodStart(budget.period, currentStart);
    }

    return { periods };
  }

  async getBudgetPeriodDetail(
    userId: string,
    budgetId: string,
    periodId: string,
  ): Promise<BudgetPeriodDetailResponse> {
    await this.validateOwnership(userId, budgetId);

    const period = await this.deps.db.budgetPeriodRecord.findFirst({
      where: { id: periodId, budgetId },
    });
    if (!period) {
      throwAppError(
        ErrorCode.BUDGET_PERIOD_NOT_FOUND,
        'Budget period not found',
      );
    }

    const budget = await this.deps.repository.findById(budgetId);
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

    return {
      id: period.id,
      budgetId: period.budgetId,
      periodStartDate: dateFormatter.toIsoStringRequired(
        period.periodStartDate,
      ),
      periodEndDate: dateFormatter.toIsoStringRequired(period.periodEndDate),
      carriedOverAmount: decimalFormatter.toString(carriedOverAmount),
      budgetAmount: decimalFormatter.toString(budgetAmount),
      totalAmount: decimalFormatter.toString(totalAmount),
      spentAmount: decimalFormatter.toString(spent),
      remainingAmount: decimalFormatter.toString(remaining),
      isOverBudget: spent.gt(totalAmount),
      created: dateFormatter.toIsoStringRequired(period.created),
      modified: dateFormatter.toIsoStringRequired(period.modified),
    };
  }
  // #endregion

  // #region Private Helpers
  private async validateAccountsAndCategories(
    userId: string,
    accountIds: string[],
    categoryIds: string[],
  ) {
    const [accounts, categories] = await Promise.all([
      this.deps.db.account.count({ where: { id: { in: accountIds }, userId } }),
      this.deps.db.category.count({
        where: { id: { in: categoryIds }, userId },
      }),
    ]);

    if (accounts !== accountIds.length) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Some accounts not found');
    }
    if (categories !== categoryIds.length) {
      throwAppError(ErrorCode.CATEGORY_NOT_FOUND, 'Some categories not found');
    }
  }

  private async calculatePeriodSpending(
    userId: string,
    budgetId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Decimal> {
    const budget = await this.deps.repository.findById(budgetId);
    if (!budget) {
      throwAppError(ErrorCode.BUDGET_NOT_FOUND, 'Budget not found');
    }

    const accountIds = budget.accounts.map((a) => a.accountId);
    const categoryIds = budget.categories.map((c) => c.categoryId);
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);

    const transactions = await this.deps.db.transaction.findMany({
      where: {
        userId,
        type: TransactionType.expense,
        accountId: { in: accountIds },
        categoryId: { in: categoryIds },
        date: { gte: periodStart, lte: periodEnd },
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
    for (const tx of transactions) {
      const amountInBase =
        await this.deps.currencyConversionService.getAmountInBaseCurrency(
          tx,
          baseCurrencyId,
        );
      totalSpent = totalSpent.add(amountInBase);
    }
    return totalSpent;
  }

  private async getCarryOverAmount(
    userId: string,
    budgetId: string,
    previousPeriodEnd: Date,
  ): Promise<Decimal> {
    const budget = await this.deps.repository.findById(budgetId);
    if (!budget || !budget.carryOver) {
      return new Decimal(0);
    }

    const previousPeriodStart = this.calculatePeriodStart(
      budget.period,
      previousPeriodEnd,
    );

    const spent = await this.calculatePeriodSpending(
      userId,
      budgetId,
      previousPeriodStart,
      previousPeriodEnd,
    );

    const remaining = new Decimal(budget.amount).sub(spent);
    return remaining.gt(0) ? remaining : new Decimal(0);
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
      default:
        throwAppError(ErrorCode.VALIDATION_ERROR, 'Invalid period type');
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
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.quarterly:
        end.setMonth(end.getMonth() + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.yearly:
        end.setFullYear(end.getFullYear() + 1, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        throwAppError(ErrorCode.VALIDATION_ERROR, 'Invalid period type');
    }
    return end;
  }

  private calculatePeriodStart(period: BudgetPeriod, periodEnd: Date): Date {
    const start = new Date(periodEnd);
    switch (period) {
      case BudgetPeriod.daily:
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.monthly:
        start.setMonth(start.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.quarterly:
        start.setMonth(start.getMonth() - 3, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.yearly:
        start.setFullYear(start.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        throwAppError(ErrorCode.VALIDATION_ERROR, 'Invalid period type');
    }
    return start;
  }

  private async getUserBaseCurrencyId(userId: string): Promise<string> {
    const cacheKey = `user:${userId}:baseCurrencyId`;
    const cached = this.deps.cache?.get<string>(cacheKey);
    if (cached) return cached;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { baseCurrencyId: true },
    });
    if (!user?.baseCurrencyId) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'User base currency is required',
      );
    }

    this.deps.cache?.set(cacheKey, user.baseCurrencyId, 5 * 60 * 1000);
    return user.baseCurrencyId;
  }
  // #endregion

  // #region Legacy Methods
  async upsertBudget(
    userId: string,
    data: IUpsertBudgetDto,
  ): Promise<BudgetResponse> {
    return this.upsert(userId, data);
  }

  async listBudgets(
    userId: string,
    query: IListBudgetsQueryDto,
  ): Promise<BudgetListResponse> {
    return this.list(userId, query);
  }

  async deleteManyBudgets(userId: string, ids: string[]): Promise<ActionRes> {
    return this.deleteMany(userId, ids);
  }
  // #endregion
}

export const budgetService = new BudgetService();
