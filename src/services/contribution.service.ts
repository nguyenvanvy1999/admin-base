import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { type ContributionType, InvestmentMode } from '@server/generated';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import {
  dateToIsoString,
  decimalToNullableNumber,
  decimalToNumber,
} from '@server/share/utils/formatters';
import type {
  ICreateInvestmentContributionDto,
  IListInvestmentContributionsQueryDto,
  InvestmentContributionListResponse,
  InvestmentContributionResponse,
} from '../dto/contribution.dto';
import {
  type AccountBalanceService,
  accountBalanceService,
} from './account-balance.service';
import {
  type InvestmentService,
  investmentService,
} from './investment.service';
import {
  type InvestmentPositionService,
  investmentPositionService,
} from './investment-position.service';
import { CONTRIBUTION_SELECT_FULL } from './selects';

type ContributionRecord = Prisma.InvestmentContributionGetPayload<{
  select: typeof CONTRIBUTION_SELECT_FULL;
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
  constructor(
    private readonly deps: {
      db: IDb;
      investmentService: InvestmentService;
      accountBalanceService: AccountBalanceService;
      investmentPositionService: InvestmentPositionService;
    } = {
      db: prisma,
      investmentService: investmentService,
      accountBalanceService: accountBalanceService,
      investmentPositionService: investmentPositionService,
    },
  ) {}

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throwAppError(ErrorCode.INVALID_DATE, 'Invalid date provided');
    }

    return date;
  }

  async validateContribution(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentContributionDto,
  ) {
    const investment = await this.deps.investmentService.ensureInvestment(
      userId,
      investmentId,
    );

    if (data.accountId) {
      const account = await this.deps.db.account.findFirst({
        where: { id: data.accountId, userId },
        select: { id: true, currencyId: true },
      });

      if (!account) {
        throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
      }

      if (!investment.baseCurrencyId) {
        if (account.currencyId !== investment.currencyId) {
          throwAppError(
            ErrorCode.INVALID_CURRENCY_MISMATCH,
            'Account currency must match investment currency',
          );
        }
      }
    }

    if (investment.currencyId !== data.currencyId) {
      throwAppError(
        ErrorCode.INVALID_CURRENCY_MISMATCH,
        'Contribution currency must match investment currency',
      );
    }

    if (
      data.type === 'withdrawal' &&
      investment.mode === InvestmentMode.manual
    ) {
      const position = await this.deps.investmentPositionService.getPosition(
        userId,
        investmentId,
      );
      if (data.amount > position.costBasis) {
        throwAppError(
          ErrorCode.WITHDRAWAL_EXCEEDS_BALANCE,
          'Withdrawal amount exceeds current cost basis',
        );
      }
    }

    return investment;
  }

  async createContribution(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentContributionDto,
  ): Promise<InvestmentContributionResponse> {
    await this.validateContribution(userId, investmentId, data);

    const timestamp = this.parseDate(data.timestamp);

    // Only update balance if accountId is provided
    if (data.accountId) {
      const account = await this.deps.db.account.findFirst({
        where: { id: data.accountId, userId },
        select: { id: true },
      });

      if (!account) {
        throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
      }
    }

    return this.deps.db.$transaction(async (tx) => {
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
        select: CONTRIBUTION_SELECT_FULL,
      });

      if (data.accountId) {
        await this.deps.accountBalanceService.applyContributionBalance(
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
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

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
      this.deps.db.investmentContribution.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        skip,
        take: limit,
        select: CONTRIBUTION_SELECT_FULL,
      }),
      this.deps.db.investmentContribution.count({ where }),
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
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

    const contribution = await this.deps.db.investmentContribution.findFirst({
      where: {
        id: contributionId,
        userId,
        investmentId,
        deletedAt: null,
      },
      select: CONTRIBUTION_SELECT_FULL,
    });

    if (!contribution) {
      throwAppError(ErrorCode.CONTRIBUTION_NOT_FOUND, 'Contribution not found');
    }

    return this.deps.db.$transaction(async (tx) => {
      if (contribution.accountId) {
        await this.deps.accountBalanceService.revertContributionBalance(
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

export const investmentContributionService =
  new InvestmentContributionService();
