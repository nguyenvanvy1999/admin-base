import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import type {
  IListInvestmentValuationsQueryDto,
  IUpsertInvestmentValuationDto,
} from '../dto/valuation.dto';
import {
  type InvestmentService,
  investmentService,
} from './investment.service';
import { mapValuation } from './mappers';
import { VALUATION_SELECT_FULL } from './selects';

export class InvestmentValuationService {
  constructor(
    private readonly deps: {
      db: IDb;
      investmentService: InvestmentService;
      idUtil: IdUtil;
    } = {
      db: prisma,
      investmentService: investmentService,
      idUtil,
    },
  ) {}

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throwAppError(ErrorCode.INVALID_DATE, 'Invalid date provided');
    }

    return date;
  }

  async upsertValuation(
    userId: string,
    investmentId: string,
    data: IUpsertInvestmentValuationDto,
  ) {
    await this.deps.investmentService.validateValuation(
      userId,
      investmentId,
      data,
    );

    const timestamp = this.parseDate(data.timestamp);
    const fetchedAt = data.fetchedAt ? this.parseDate(data.fetchedAt) : null;

    const existing = await this.deps.db.investmentValuation.findFirst({
      where: {
        userId,
        investmentId,
        timestamp,
      },
      select: { id: true },
    });

    if (existing) {
      return mapValuation(
        await this.deps.db.investmentValuation.update({
          where: { id: existing.id },
          data: {
            price: data.price,
            currencyId: data.currencyId,
            priceInBaseCurrency: data.priceInBaseCurrency ?? null,
            exchangeRate: data.exchangeRate ?? null,
            baseCurrencyId: data.baseCurrencyId ?? null,
            source: data.source ?? null,
            fetchedAt,
          },
          select: VALUATION_SELECT_FULL,
        }),
      );
    }

    return mapValuation(
      await this.deps.db.investmentValuation.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.VALUATION),
          userId,
          investmentId,
          price: data.price,
          currencyId: data.currencyId,
          priceInBaseCurrency: data.priceInBaseCurrency ?? null,
          exchangeRate: data.exchangeRate ?? null,
          baseCurrencyId: data.baseCurrencyId ?? null,
          timestamp,
          source: data.source ?? null,
          fetchedAt,
        },
        select: VALUATION_SELECT_FULL,
      }),
    );
  }

  async listValuations(
    userId: string,
    investmentId: string,
    query: IListInvestmentValuationsQueryDto,
  ) {
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

    const { dateFrom, dateTo, page, limit = 50, sortOrder = 'desc' } = query;

    const where: Record<string, unknown> = {
      userId,
      investmentId,
    };

    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom ? { gte: this.parseDate(dateFrom) } : {}),
        ...(dateTo ? { lte: this.parseDate(dateTo) } : {}),
      };
    }

    const skip = (page - 1) * limit;

    const [valuations, total] = await Promise.all([
      this.deps.db.investmentValuation.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        skip,
        take: limit,
        select: VALUATION_SELECT_FULL,
      }),
      this.deps.db.investmentValuation.count({ where }),
    ]);

    return {
      valuations: valuations.map(mapValuation),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLatestValuation(userId: string, investmentId: string) {
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

    const valuation = await this.deps.db.investmentValuation.findFirst({
      where: { userId, investmentId },
      orderBy: { timestamp: 'desc' },
      select: VALUATION_SELECT_FULL,
    });

    if (!valuation) {
      return null;
    }
    return mapValuation(valuation);
  }

  async deleteManyValuations(
    userId: string,
    investmentId: string,
    valuationIds: string[],
  ) {
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

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

export const investmentValuationService = new InvestmentValuationService();
