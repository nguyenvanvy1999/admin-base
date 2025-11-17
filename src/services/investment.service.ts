import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { InvestmentWhereInput, Prisma } from '@server/generated';
import { InvestmentMode } from '@server/generated';
import {
  type InvestmentRepository,
  investmentRepository,
} from '@server/repositories/investment.repository';
import {
  type ValuationRepository,
  valuationRepository,
} from '@server/repositories/valuation.repository';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import { dateFormatter } from '@server/share/utils/service.util';
import type {
  IListInvestmentsQueryDto,
  InvestmentListResponse,
  InvestmentResponse,
  IUpsertInvestmentDto,
} from '../dto/investment.dto';
import type { ICreateInvestmentTradeDto } from '../dto/trade.dto';
import type { IUpsertInvestmentValuationDto } from '../dto/valuation.dto';
import { BaseService } from './base/base.service';
import { cacheService } from './base/cache.service';
import type {
  ICacheService,
  IDb,
  IIdUtil,
  IOwnershipValidatorService,
} from './base/interfaces';
import { ownershipValidatorService } from './base/ownership-validator.service';
import type { INVESTMENT_SELECT_FULL } from './selects';

type InvestmentRecord = Prisma.InvestmentGetPayload<{
  select: typeof INVESTMENT_SELECT_FULL;
}>;

export class InvestmentService extends BaseService<
  InvestmentRecord,
  IUpsertInvestmentDto,
  InvestmentResponse,
  InvestmentListResponse,
  InvestmentRepository
> {
  // InvestmentService has a dependency on ValuationRepository for getLatestValuation
  private readonly valuationRepository: ValuationRepository;

  constructor(
    deps: {
      db: IDb;
      repository: InvestmentRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
      valuationRepository: ValuationRepository;
    } = {
      db: prisma,
      repository: investmentRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
      valuationRepository: valuationRepository,
    },
  ) {
    super(deps, {
      entityName: 'Investment',
      dbPrefix: DB_PREFIX.INVESTMENT,
    });
    this.valuationRepository = deps.valuationRepository;
  }

  protected formatEntity(investment: InvestmentRecord): InvestmentResponse {
    return {
      ...investment,
      extra: investment.extra ?? null,
      created: dateFormatter.toIsoStringRequired(investment.created),
      modified: dateFormatter.toIsoStringRequired(investment.modified),
    };
  }

  async upsert(
    userId: string,
    data: IUpsertInvestmentDto,
  ): Promise<InvestmentResponse> {
    await this.ensureCurrency(data.currencyId);
    if (data.baseCurrencyId) {
      await this.ensureCurrency(data.baseCurrencyId);
    }

    const payload = {
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType,
      mode: data.mode ?? InvestmentMode.priced,
      currencyId: data.currencyId,
      baseCurrencyId: data.baseCurrencyId ?? null,
      extra: data.extra as any,
    };

    if (data.id) {
      await this.validateOwnership(userId, data.id);
      const updated = await this.deps.repository.update(data.id, payload);
      return this.formatEntity(updated);
    }

    const created = await this.deps.repository.create({
      id: this.deps.idUtil.dbId(this.config.dbPrefix),
      ...payload,
      userId,
    });
    return this.formatEntity(created);
  }

  async list(
    userId: string,
    query: IListInvestmentsQueryDto,
  ): Promise<InvestmentListResponse> {
    const {
      assetTypes,
      modes,
      currencyIds,
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: InvestmentWhereInput = {
      userId,
      ...(assetTypes?.length ? { assetType: { in: assetTypes } } : {}),
      ...(modes?.length ? { mode: { in: modes } } : {}),
      ...(currencyIds?.length ? { currencyId: { in: currencyIds } } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { name: { contains: search.trim(), mode: 'insensitive' } },
              { symbol: { contains: search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = { [sortBy]: sortOrder };
    const skip = this.calculateSkip(page, limit);

    const [items, total] = await Promise.all([
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
      investments: items.map((investment) => this.formatEntity(investment)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }

  // #region Specific Public Methods
  async ensureInvestment(
    userId: string,
    investmentId: string,
  ): Promise<InvestmentRecord> {
    const investment = await this.deps.repository.findByIdAndUserId(
      investmentId,
      userId,
    );
    if (!investment) {
      throwAppError(ErrorCode.INVESTMENT_NOT_FOUND, 'Investment not found');
    }
    return investment;
  }

  async getInvestment(
    userId: string,
    investmentId: string,
  ): Promise<InvestmentResponse> {
    const investment = await this.ensureInvestment(userId, investmentId);
    return this.formatEntity(investment);
  }

  async getLatestValuation(userId: string, investmentId: string) {
    await this.ensureInvestment(userId, investmentId);
    const valuation =
      await this.valuationRepository.findLatestByInvestmentId(investmentId);

    if (!valuation) {
      return null;
    }

    return {
      id: valuation.id,
      price: valuation.price.toString(),
      timestamp: valuation.timestamp.toISOString(),
      currencyId: valuation.currencyId,
      source: valuation.source,
      fetchedAt: valuation.fetchedAt ? valuation.fetchedAt.toISOString() : null,
      priceInBaseCurrency: valuation.priceInBaseCurrency
        ? valuation.priceInBaseCurrency.toString()
        : null,
      exchangeRate: valuation.exchangeRate
        ? valuation.exchangeRate.toString()
        : null,
    };
  }

  async validateTrade(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentTradeDto,
  ) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (investment.mode !== InvestmentMode.priced) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Trades are only allowed for priced investments',
      );
    }

    if (investment.currencyId !== data.currencyId) {
      throwAppError(
        ErrorCode.INVALID_CURRENCY_MISMATCH,
        'Trade currency must match investment currency',
      );
    }

    await this.deps.ownershipValidator.validateAccountOwnership(
      userId,
      data.accountId,
    );

    return investment;
  }

  async validateValuation(
    userId: string,
    investmentId: string,
    data: IUpsertInvestmentValuationDto,
  ) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (investment.currencyId !== data.currencyId) {
      throwAppError(
        ErrorCode.INVALID_CURRENCY_MISMATCH,
        'Valuation currency must match investment currency',
      );
    }

    return investment;
  }
  // #endregion

  // #region Private Helpers
  private async ensureCurrency(currencyId: string) {
    const exists = await this.deps.db.currency.findUnique({
      where: { id: currencyId },
      select: { id: true },
    });
    if (!exists) {
      throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
    }
  }
  // #endregion

  // #region Legacy Methods
  async upsertInvestment(
    userId: string,
    data: IUpsertInvestmentDto,
  ): Promise<InvestmentResponse> {
    return this.upsert(userId, data);
  }

  async listInvestments(
    userId: string,
    query: IListInvestmentsQueryDto,
  ): Promise<InvestmentListResponse> {
    return this.list(userId, query);
  }

  async deleteManyInvestments(userId: string, ids: string[]) {
    return this.deleteMany(userId, ids);
  }
  // #endregion
}

export const investmentService = new InvestmentService();
