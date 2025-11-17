import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  InvestmentContributionWhereInput,
  Prisma,
} from '@server/generated';
import { type ContributionType, InvestmentMode } from '@server/generated';
import {
  type ContributionRepository,
  contributionRepository,
} from '@server/repositories/contribution.repository';
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
import { investmentService } from './investment.service';
import {
  type InvestmentPositionService,
  investmentPositionService,
} from './investment-position.service';
import { CONTRIBUTION_SELECT_FULL } from './selects';

type ContributionRecord = Prisma.InvestmentContributionGetPayload<{
  select: typeof CONTRIBUTION_SELECT_FULL;
}>;

export class ContributionService extends BaseService<
  ContributionRecord,
  ICreateInvestmentContributionDto,
  InvestmentContributionResponse,
  InvestmentContributionListResponse,
  ContributionRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: ContributionRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
      accountBalanceService: AccountBalanceService;
      investmentPositionService: InvestmentPositionService;
    } = {
      db: prisma,
      repository: contributionRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
      accountBalanceService: accountBalanceService,
      investmentPositionService: investmentPositionService,
    },
  ) {
    super(deps, {
      entityName: 'Contribution',
      dbPrefix: DB_PREFIX.CONTRIBUTION,
    });
  }

  protected formatEntity(
    contribution: ContributionRecord,
  ): InvestmentContributionResponse {
    return {
      ...contribution,
      accountId: contribution.accountId ?? null,
      amount: decimalFormatter.toString(contribution.amount),
      amountInBaseCurrency: decimalFormatter.toNullableString(
        contribution.amountInBaseCurrency,
      ),
      exchangeRate: decimalFormatter.toNullableString(
        contribution.exchangeRate,
      ),
      baseCurrencyId: contribution.baseCurrencyId ?? null,
      timestamp: dateFormatter.toIsoStringRequired(contribution.timestamp),
      note: contribution.note ?? null,
      created: dateFormatter.toIsoStringRequired(contribution.created),
      modified: dateFormatter.toIsoStringRequired(contribution.modified),
      account: contribution.account
        ? {
            id: contribution.account.id,
            name: contribution.account.name,
          }
        : null,
      baseCurrency: contribution.baseCurrency ?? null,
    };
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throwAppError(ErrorCode.INVALID_DATE, 'Invalid date provided');
    }
    return date;
  }

  // `upsert` is not applicable for contributions, as they are immutable records.
  async upsert(
    userId: string,
    data: ICreateInvestmentContributionDto & { investmentId: string },
  ): Promise<InvestmentContributionResponse> {
    return this.createContribution(userId, data.investmentId, data);
  }

  async createContribution(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentContributionDto,
  ): Promise<InvestmentContributionResponse> {
    await this.validateContribution(userId, investmentId, data);

    const timestamp = this.parseDate(data.timestamp);

    if (data.accountId) {
      await this.deps.ownershipValidator.validateAccountOwnership(
        userId,
        data.accountId,
      );
    }

    return this.deps.db.$transaction(async (tx) => {
      const contribution = await tx.investmentContribution.create({
        data: {
          id: this.deps.idUtil.dbId(this.config.dbPrefix),
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

      return this.formatEntity(contribution);
    });
  }

  async list(
    userId: string,
    query: IListInvestmentContributionsQueryDto & { investmentId: string },
  ): Promise<InvestmentContributionListResponse> {
    await investmentService.ensureInvestment(userId, query.investmentId);

    const { accountIds, dateFrom, dateTo, page, limit, sortOrder } = query;

    const where: InvestmentContributionWhereInput = {
      userId,
      investmentId: query.investmentId,
    };

    if (accountIds?.length) where.accountId = { in: accountIds };

    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom ? { gte: this.parseDate(dateFrom) } : {}),
        ...(dateTo ? { lte: this.parseDate(dateTo) } : {}),
      };
    }

    const skip = this.calculateSkip(page, limit);

    const [contributions, total] = await Promise.all([
      this.deps.repository.findManyByUserId(
        userId,
        where,
        { timestamp: sortOrder },
        skip,
        limit,
      ),
      this.deps.repository.countByUserId(userId, where),
    ]);

    return {
      contributions: contributions.map((c) => this.formatEntity(c)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }

  async deleteManyContributions(
    userId: string,
    investmentId: string,
    contributionIds: string[],
  ) {
    await investmentService.ensureInvestment(userId, investmentId);

    const contributions = await this.deps.db.investmentContribution.findMany({
      where: { id: { in: contributionIds }, userId, investmentId },
      select: CONTRIBUTION_SELECT_FULL,
    });

    if (contributions.length !== contributionIds.length) {
      throwAppError(
        ErrorCode.CONTRIBUTION_NOT_FOUND,
        'Some contributions were not found or do not belong to you',
      );
    }

    return this.deps.db.$transaction(async (tx) => {
      for (const contribution of contributions) {
        if (contribution.accountId) {
          await this.deps.accountBalanceService.revertContributionBalance(
            tx,
            contribution.type,
            contribution.accountId,
            contribution.amount,
          );
        }
      }

      await tx.investmentContribution.deleteMany({
        where: { id: { in: contributionIds }, userId, investmentId },
      });

      return {
        success: true,
        message: `${contributionIds.length} contribution(s) deleted successfully`,
      };
    });
  }

  private async validateContribution(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentContributionDto,
  ) {
    const investment = await investmentService.ensureInvestment(
      userId,
      investmentId,
    );

    if (data.accountId) {
      await this.deps.ownershipValidator.validateAccountOwnership(
        userId,
        data.accountId,
      );
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
  }

  // Legacy Methods
  async listContributions(
    userId: string,
    investmentId: string,
    query: IListInvestmentContributionsQueryDto,
  ): Promise<InvestmentContributionListResponse> {
    return this.list(userId, { ...query, investmentId });
  }
}

export const contributionService = new ContributionService();
