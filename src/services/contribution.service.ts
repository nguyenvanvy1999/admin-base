import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated/prisma/client';
import type { ContributionType } from '@server/generated/prisma/enums';
import {
  dateToIsoString,
  decimalToNullableNumber,
  decimalToNumber,
} from '@server/share/utils/formatters';
import { Elysia } from 'elysia';
import type {
  ICreateInvestmentContributionDto,
  IListInvestmentContributionsQueryDto,
  InvestmentContributionListResponse,
  InvestmentContributionResponse,
} from '../dto/contribution.dto';
import { accountBalanceServiceInstance } from './account-balance.service';
import { investmentServiceInstance } from './investment.service';
import { CONTRIBUTION_SELECT_MINIMAL, CURRENCY_SELECT_BASIC } from './selects';

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

type ContributionRecord = Prisma.InvestmentContributionGetPayload<{
  select: typeof CONTRIBUTION_SELECT;
}>;

const formatContribution = (
  contribution: ContributionRecord,
): InvestmentContributionResponse => ({
  ...contribution,
  accountId: contribution.accountId ?? null,
  amount: decimalToNumber(contribution.amount),
  amountInBaseCurrency: decimalToNullableNumber(
    contribution.amountInBaseCurrency,
  ),
  exchangeRate: decimalToNullableNumber(contribution.exchangeRate),
  baseCurrencyId: contribution.baseCurrencyId ?? null,
  timestamp: dateToIsoString(contribution.timestamp),
  note: contribution.note ?? null,
  createdAt: dateToIsoString(contribution.createdAt),
  updatedAt: dateToIsoString(contribution.updatedAt),
  account: contribution.account
    ? {
        id: contribution.account.id,
        name: contribution.account.name,
      }
    : null,
  baseCurrency: contribution.baseCurrency ?? null,
});

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
  ): Promise<InvestmentContributionResponse> {
    await this.investmentService.validateContribution(
      userId,
      investmentId,
      data,
    );

    const timestamp = this.parseDate(data.timestamp);

    // Only update balance if accountId is provided
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, userId },
        select: { id: true },
      });

      if (!account) {
        throw new Error('Account not found');
      }
    }

    return prisma.$transaction(async (tx) => {
      const contribution = await tx.investmentContribution.create({
        data: {
          userId,
          investmentId,
          accountId: data.accountId ?? null,
          amount: data.amount,
          currencyId: data.currencyId,
          type: data.type as ContributionType,
          amountInBaseCurrency: data.amountInBaseCurrency ?? null,
          exchangeRate: data.exchangeRate ?? null,
          baseCurrencyId: data.baseCurrencyId ?? null,
          timestamp,
          note: data.note ?? null,
        },
        select: CONTRIBUTION_SELECT,
      });

      if (data.accountId) {
        await accountBalanceServiceInstance.applyContributionBalance(
          tx,
          data.type as ContributionType,
          data.accountId,
          data.amount,
        );
      }

      return formatContribution(contribution);
    });
  }

  async listContributions(
    userId: string,
    investmentId: string,
    query: IListInvestmentContributionsQueryDto = {},
  ): Promise<InvestmentContributionListResponse> {
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
      deletedAt: null,
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
      contributions: contributions.map(formatContribution),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteContribution(
    userId: string,
    investmentId: string,
    contributionId: string,
  ) {
    await this.investmentService.ensureInvestment(userId, investmentId);

    const contribution = await prisma.investmentContribution.findFirst({
      where: {
        id: contributionId,
        userId,
        investmentId,
        deletedAt: null,
      },
      select: CONTRIBUTION_SELECT_MINIMAL,
    });

    if (!contribution) {
      throw new Error('Contribution not found');
    }

    return prisma.$transaction(async (tx) => {
      if (contribution.accountId) {
        await accountBalanceServiceInstance.revertContributionBalance(
          tx,
          contribution.type,
          contribution.accountId,
          contribution.amount,
        );
      }

      await tx.investmentContribution.update({
        where: { id: contributionId },
        data: { deletedAt: new Date() },
      });

      return { success: true, message: 'Contribution deleted successfully' };
    });
  }
}

export const investmentContributionServiceInstance =
  new InvestmentContributionService();

export default new Elysia().decorate(
  'investmentContributionService',
  investmentContributionServiceInstance,
);
