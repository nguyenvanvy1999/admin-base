import { prisma } from '@server/configs/db';
import type {
  GoalOrderByWithRelationInput,
  GoalWhereInput,
} from '@server/generated';
import {
  DB_PREFIX,
  decimalToString,
  ErrorCode,
  idUtil,
  throwAppError,
} from '@server/share';
import { deleteManyResources } from '@server/share/utils/delete-many.util';
import { validateResourceOwnership } from '@server/share/utils/ownership.util';
import { calculatePagination } from '@server/share/utils/pagination.util';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import type { IListGoalsQueryDto, IUpsertGoalDto } from '../dto/goal.dto';
import { BaseService } from './base/base.service';
import type { BaseServiceDependencies } from './base/service-dependencies';
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

export class GoalService extends BaseService {
  private readonly currencyConversionService: CurrencyConversionService;

  constructor(
    deps: BaseServiceDependencies & {
      currencyConversionService: CurrencyConversionService;
    } = {
      db: prisma,
      idUtil,
      currencyConversionService: currencyConversionService,
    },
  ) {
    super(deps);
    this.currencyConversionService = deps.currencyConversionService;
  }

  private async validateAccounts(userId: string, accountIds: string[]) {
    const accounts = await this.db.account.findMany({
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
    const accounts = await this.db.account.findMany({
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
          await this.currencyConversionService.convertToBaseCurrency(
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
      validateResourceOwnership(
        userId,
        data.id,
        this.idUtil,
        ErrorCode.GOAL_NOT_FOUND,
        'Goal not found',
      );
    }

    await this.validateAccounts(userId, data.accountIds);

    if (data.id) {
      const goal = await this.db.goal.update({
        where: { id: data.id },
        data: {
          name: data.name,
          amount: data.amount,
          currencyId: data.currencyId,
          startDate: dayjs(data.startDate).toDate(),
          endDate: data.endDate ? dayjs(data.endDate).toDate() : null,
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
      const goal = await this.db.goal.create({
        data: {
          id: this.idUtil.dbIdWithUserId(DB_PREFIX.GOAL, userId),
          userId,
          name: data.name,
          amount: data.amount,
          currencyId: data.currencyId,
          startDate: dayjs(data.startDate).toDate(),
          endDate: data.endDate ? dayjs(data.endDate).toDate() : null,
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
    const goal = await this.db.goal.findFirst({
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
    const goal = await this.db.goal.findFirst({
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
      const endDate = dayjs(goal.endDate).startOf('day');
      const today = dayjs().startOf('day');

      const diffDays = Math.ceil(endDate.diff(today, 'day', true));

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

    type GoalSortKey = NonNullable<IListGoalsQueryDto['sortBy']>;
    const orderBy = this.buildOrderBy<
      GoalSortKey,
      GoalOrderByWithRelationInput
    >(sortBy, sortOrder, {
      name: 'name',
      amount: 'amount',
      startDate: 'startDate',
      endDate: 'endDate',
      created: 'created',
    }) as GoalOrderByWithRelationInput | undefined;

    const { skip, take } = calculatePagination(page, limit);

    const [goals, total] = await Promise.all([
      this.db.goal.findMany({
        where,
        orderBy,
        skip,
        take,
        select: GOAL_SELECT_FULL,
      }),
      this.db.goal.count({ where }),
    ]);

    return {
      goals: goals.map((goal) => mapGoal(goal)),
      pagination: this.buildPaginationResponse(page, limit, total, [])
        .pagination,
    };
  }

  deleteManyGoals(userId: string, ids: string[]) {
    return deleteManyResources({
      db: this.db,
      model: 'goal',
      userId,
      ids,
      selectMinimal: GOAL_SELECT_MINIMAL,
      errorCode: ErrorCode.GOAL_NOT_FOUND,
      errorMessage: 'Some goals were not found or do not belong to you',
      resourceName: 'goal',
    });
  }
}

export const goalService = new GoalService();
