import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
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
import {
  dateFormatter,
  decimalFormatter,
} from '@server/share/utils/service.util';
import type {
  IListInvestmentValuationsQueryDto,
  InvestmentValuationListResponse,
  InvestmentValuationResponse,
  IUpsertInvestmentValuationDto,
} from '../dto/valuation.dto';
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
// This service has a dependency on InvestmentService, which is a bit of a code smell.
// This will be addressed in a future refactoring.
import { investmentService } from './investment.service';
import type { VALUATION_SELECT_FULL } from './selects';

type ValuationRecord = Prisma.InvestmentValuationGetPayload<{
  select: typeof VALUATION_SELECT_FULL;
}>;

export class ValuationService extends BaseService<
  ValuationRecord,
  IUpsertInvestmentValuationDto,
  InvestmentValuationResponse,
  InvestmentValuationListResponse,
  ValuationRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: ValuationRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
    } = {
      db: prisma,
      repository: valuationRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, {
      entityName: 'Valuation',
      dbPrefix: DB_PREFIX.VALUATION,
    });
  }

  protected formatEntity(
    valuation: ValuationRecord,
  ): InvestmentValuationResponse {
    return {
      ...valuation,
      price: decimalFormatter.toString(valuation.price),
      timestamp: dateFormatter.toIsoStringRequired(valuation.timestamp),
      fetchedAt: dateFormatter.toIsoString(valuation.fetchedAt),
      priceInBaseCurrency: decimalFormatter.toNullableString(
        valuation.priceInBaseCurrency,
      ),
      exchangeRate: decimalFormatter.toNullableString(valuation.exchangeRate),
      created: dateFormatter.toIsoStringRequired(valuation.created),
      modified: dateFormatter.toIsoStringRequired(valuation.modified),
    };
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throwAppError(ErrorCode.INVALID_DATE, 'Invalid date provided');
    }
    return date;
  }

  async upsert(
    userId: string,
    data: IUpsertInvestmentValuationDto & { investmentId: string },
  ): Promise<InvestmentValuationResponse> {
    await investmentService.validateValuation(userId, data.investmentId, data);

    const timestamp = this.parseDate(data.timestamp);
    const fetchedAt = data.fetchedAt ? this.parseDate(data.fetchedAt) : null;

    const existing = await this.deps.db.investmentValuation.findFirst({
      where: { userId, investmentId: data.investmentId, timestamp },
      select: { id: true },
    });

    const payload = {
      price: data.price,
      currencyId: data.currencyId,
      priceInBaseCurrency: data.priceInBaseCurrency ?? null,
      exchangeRate: data.exchangeRate ?? null,
      baseCurrencyId: data.baseCurrencyId ?? null,
      source: data.source ?? null,
      fetchedAt,
      timestamp,
    };

    if (existing) {
      const updated = await this.deps.repository.update(existing.id, payload);
      return this.formatEntity(updated);
    }

    const created = await this.deps.repository.create({
      ...payload,
      id: this.deps.idUtil.dbId(this.config.dbPrefix),
      userId,
      investmentId: data.investmentId,
    });
    return this.formatEntity(created);
  }

  async list(
    userId: string,
    query: IListInvestmentValuationsQueryDto & { investmentId: string },
  ): Promise<InvestmentValuationListResponse> {
    await investmentService.ensureInvestment(userId, query.investmentId);

    const { dateFrom, dateTo, page, limit = 50, sortOrder = 'desc' } = query;

    const where: Record<string, unknown> = {
      userId,
      investmentId: query.investmentId,
    };

    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom ? { gte: this.parseDate(dateFrom) } : {}),
        ...(dateTo ? { lte: this.parseDate(dateTo) } : {}),
      };
    }

    const skip = this.calculateSkip(page, limit);

    const [valuations, total] = await Promise.all([
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
      valuations: valuations.map((v) => this.formatEntity(v)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }

  async getLatestValuation(
    userId: string,
    investmentId: string,
  ): Promise<InvestmentValuationResponse | null> {
    await investmentService.ensureInvestment(userId, investmentId);

    const valuation =
      await this.deps.repository.findLatestByInvestmentId(investmentId);

    if (!valuation) {
      return null;
    }
    return this.formatEntity(valuation);
  }

  // Legacy Methods
  async upsertValuation(
    userId: string,
    investmentId: string,
    data: IUpsertInvestmentValuationDto,
  ): Promise<InvestmentValuationResponse> {
    return this.upsert(userId, { ...data, investmentId });
  }

  async listValuations(
    userId: string,
    investmentId: string,
    query: IListInvestmentValuationsQueryDto,
  ): Promise<InvestmentValuationListResponse> {
    return this.list(userId, { ...query, investmentId });
  }

  async deleteManyValuations(
    userId: string,
    investmentId: string,
    valuationIds: string[],
  ) {
    await investmentService.ensureInvestment(userId, investmentId);
    // The base deleteMany doesn't support composite keys like (userId, investmentId, id)
    // So we need to do it manually.
    const valuations = await this.deps.db.investmentValuation.findMany({
      where: {
        id: { in: valuationIds },
        userId,
        investmentId,
      },
      select: { id: true },
    });

    if (valuations.length !== valuationIds.length) {
      throwAppError(
        ErrorCode.VALUATION_NOT_FOUND,
        'Some valuations were not found or do not belong to you',
      );
    }

    await this.deps.db.investmentValuation.deleteMany({
      where: {
        id: { in: valuationIds },
        userId,
        investmentId,
      },
    });

    return {
      success: true,
      message: `${valuationIds.length} valuation(s) deleted successfully`,
    };
  }
}

export const valuationService = new ValuationService();
