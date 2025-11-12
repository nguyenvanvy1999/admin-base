import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  ICreateInvestmentContributionDto,
  IListInvestmentContributionsQueryDto,
} from '../dto/contribution.dto';
import { investmentServiceInstance } from './investment.service';
import { CURRENCY_SELECT_BASIC } from './selects';

const CONTRIBUTION_SELECT = {
  id: true,
  userId: true,
  investmentId: true,
  accountId: true,
  amount: true,
  currencyId: true,
  type: true,
  amountInBaseCurrency: true,
  exchangeRate: true,
  baseCurrencyId: true,
  timestamp: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  account: {
    select: {
      id: true,
      name: true,
    },
  },
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
  baseCurrency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

export class InvestmentContributionService {
  private readonly investmentService = investmentServiceInstance;

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }

    return date;
  }

  async createContribution(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentContributionDto,
  ) {
    await this.investmentService.validateContribution(
      userId,
      investmentId,
      data,
    );

    const timestamp = this.parseDate(data.timestamp);

    return prisma.investmentContribution.create({
      data: {
        userId,
        investmentId,
        accountId: data.accountId ?? null,
        amount: data.amount,
        currencyId: data.currencyId,
        type: data.type,
        amountInBaseCurrency: data.amountInBaseCurrency ?? null,
        exchangeRate: data.exchangeRate ?? null,
        baseCurrencyId: data.baseCurrencyId ?? null,
        timestamp,
        note: data.note ?? null,
      },
      select: CONTRIBUTION_SELECT,
    });
  }

  async listContributions(
    userId: string,
    investmentId: string,
    query: IListInvestmentContributionsQueryDto = {},
  ) {
    await this.investmentService.ensureInvestment(userId, investmentId);

    const {
      accountIds,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortOrder = 'desc',
    } = query;

    const where: Record<string, unknown> = {
      userId,
      investmentId,
    };

    if (accountIds && accountIds.length > 0) {
      where.accountId = { in: accountIds };
    }

    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom ? { gte: this.parseDate(dateFrom) } : {}),
        ...(dateTo ? { lte: this.parseDate(dateTo) } : {}),
      };
    }

    const skip = (page - 1) * limit;

    const [contributions, total] = await Promise.all([
      prisma.investmentContribution.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        skip,
        take: limit,
        select: CONTRIBUTION_SELECT,
      }),
      prisma.investmentContribution.count({ where }),
    ]);

    return {
      contributions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const investmentContributionServiceInstance =
  new InvestmentContributionService();

export default new Elysia().decorate(
  'investmentContributionService',
  investmentContributionServiceInstance,
);
