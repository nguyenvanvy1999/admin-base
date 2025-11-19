import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  GoalOrderByWithRelationInput,
  GoalWhereInput,
} from '@server/generated';
import {
  DB_PREFIX,
  decimalToString,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import Decimal from 'decimal.js';
import type { IListGoalsQueryDto, IUpsertGoalDto } from '../dto/goal.dto';
import {
  type CurrencyConversionService,
  currencyConversionService,
} from './currency-conversion.service';
import { mapGoal } from './mappers/goal.mapper';
import {
  ACCOUNT_SELECT_FULL,
  GOAL_SELECT_FULL,
  GOAL_SELECT_MINIMAL,
} from './selects';

export class GoalService {
  constructor(
    private readonly deps: {
      db: IDb;
      currencyConversionService: CurrencyConversionService;
      idUtil: IdUtil;
    } = {
      db: prisma,
      currencyConversionService: currencyConversionService,
      idUtil,
    },
  ) {}

  private async validateGoalOwnership(userId: string, goalId: string) {
    const goal = await this.deps.db.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
      select: GOAL_SELECT_MINIMAL,
    });
    if (!goal) {
      throwAppError(ErrorCode.GOAL_NOT_FOUND, 'Goal not found');
    }
    return goal;
  }

  private async validateAccounts(userId: string, accountIds: string[]) {
    const accounts = await this.deps.db.account.findMany({
      where: {
        id: { in: accountIds },
        userId,
      },
      select: { id: true },
    });

    if (accounts.length !== accountIds.length) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Some accounts not found');
    }
  }

  private async calculateCurrentAmount(
    userId: string,
    accountIds: string[],
    goalCurrencyId: string,
  ): Promise<Decimal> {
    const accounts = await this.deps.db.account.findMany({
      where: {
        id: { in: accountIds },
        userId,
      },
      select: {
        id: true,
        balance: true,
        currencyId: true,
      },
    });

    let totalAmount = new Decimal(0);

    for (const account of accounts) {
      let balanceInGoalCurrency: Decimal;
      if (account.currencyId === goalCurrencyId) {
        balanceInGoalCurrency = new Decimal(account.balance);
      } else {
        balanceInGoalCurrency =
          await this.deps.currencyConversionService.convertToBaseCurrency(
            account.balance,
            account.currencyId,
            goalCurrencyId,
          );
      }
      totalAmount = totalAmount.add(balanceInGoalCurrency);
    }

    return totalAmount;
  }

  async upsertGoal(userId: string, data: IUpsertGoalDto) {
    if (data.id) {
      await this.validateGoalOwnership(userId, data.id);
    }

    await this.validateAccounts(userId, data.accountIds);

    if (data.id) {
      const goal = await this.deps.db.goal.update({
        where: { id: data.id },
        data: {
          name: data.name,
          amount: data.amount,
          currencyId: data.currencyId,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          goalAccounts: {
            deleteMany: {},
            create: data.accountIds.map((accountId) => ({
              accountId,
            })),
          },
        },
        select: GOAL_SELECT_FULL,
      });
      return mapGoal(goal);
    } else {
      const goal = await this.deps.db.goal.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.GOAL),
          userId,
          name: data.name,
          amount: data.amount,
          currencyId: data.currencyId,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          goalAccounts: {
            create: data.accountIds.map((accountId) => ({
              accountId,
            })),
          },
        },
        select: GOAL_SELECT_FULL,
      });
      return mapGoal(goal);
    }
  }

  async getGoal(userId: string, goalId: string) {
    const goal = await this.deps.db.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
      select: GOAL_SELECT_FULL,
    });

    if (!goal) {
      throwAppError(ErrorCode.GOAL_NOT_FOUND, 'Goal not found');
    }

    return mapGoal(goal);
  }

  async getGoalDetail(userId: string, goalId: string) {
    const goal = await this.deps.db.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
      select: {
        ...GOAL_SELECT_FULL,
        goalAccounts: {
          select: {
            account: {
              select: ACCOUNT_SELECT_FULL,
            },
          },
        },
      },
    });

    if (!goal) {
      throwAppError(ErrorCode.GOAL_NOT_FOUND, 'Goal not found');
    }

    const accountIds = goal.goalAccounts.map((ga) => ga.account.id);
    const currentAmount = await this.calculateCurrentAmount(
      userId,
      accountIds,
      goal.currencyId,
    );

    const targetAmount = new Decimal(goal.amount);
    const progressPercent = targetAmount.gt(0)
      ? currentAmount.div(targetAmount).mul(100).toNumber()
      : 0;
    const remainingAmount = targetAmount.sub(currentAmount);

    let daysRemaining: number | null = null;
    let averageDailyNeeded: string | null = null;

    if (goal.endDate) {
      const endDate = new Date(goal.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        daysRemaining = diffDays;
        averageDailyNeeded = remainingAmount.div(daysRemaining).toFixed(2);
      } else {
        daysRemaining = 0;
      }
    }

    const accounts = goal.goalAccounts.map(
      (ga: {
        account: { id: string; name: string; balance: any; currency: any };
      }) => ({
        id: ga.account.id,
        name: ga.account.name,
        balance: decimalToString(ga.account.balance),
        currency: ga.account.currency,
      }),
    );

    // Map goal manually since we have different structure
    const baseGoal = {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      amount: decimalToString(goal.amount),
      currencyId: goal.currencyId,
      startDate: goal.startDate.toISOString(),
      endDate: goal.endDate ? goal.endDate.toISOString() : null,
      accountIds: goal.goalAccounts.map(
        (ga: { account: { id: string } }) => ga.account.id,
      ),
      created: goal.created.toISOString(),
      modified: goal.modified.toISOString(),
      currency: goal.currency,
    };

    return {
      ...baseGoal,
      currentAmount: decimalToString(currentAmount),
      progressPercent,
      remainingAmount: decimalToString(remainingAmount),
      daysRemaining,
      averageDailyNeeded,
      accounts,
    };
  }

  async listGoals(userId: string, query: IListGoalsQueryDto) {
    const {
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: GoalWhereInput = {
      userId,
    };

    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const orderBy: GoalOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'amount') {
      orderBy.amount = sortOrder;
    } else if (sortBy === 'startDate') {
      orderBy.startDate = sortOrder;
    } else if (sortBy === 'endDate') {
      orderBy.endDate = sortOrder;
    } else if (sortBy === 'created') {
      orderBy.created = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [goals, total] = await Promise.all([
      this.deps.db.goal.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: GOAL_SELECT_FULL,
      }),
      this.deps.db.goal.count({ where }),
    ]);

    return {
      goals: goals.map((goal) => mapGoal(goal)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteManyGoals(userId: string, ids: string[]) {
    const goals = await this.deps.db.goal.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: GOAL_SELECT_MINIMAL,
    });

    if (goals.length !== ids.length) {
      throwAppError(
        ErrorCode.BUDGET_NOT_FOUND,
        'Some goals were not found or do not belong to you',
      );
    }

    await this.deps.db.goal.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return {
      success: true,
      message: `${ids.length} goal(s) deleted successfully`,
    };
  }
}

export const goalService = new GoalService();
