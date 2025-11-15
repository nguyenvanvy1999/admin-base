import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import type {
  IListInvestmentValuationsQueryDto,
  IUpsertInvestmentValuationDto,
} from '../dto/valuation.dto';
import {
  type InvestmentService,
  investmentService,
} from './investment.service';
import { VALUATION_SELECT_FULL } from './selects';

export class InvestmentValuationService {
  constructor(
    private readonly deps: {
      db: IDb;
      investmentService: InvestmentService;
    } = {
      db: prisma,
      investmentService: investmentService,
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
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      return this.mapValuation(
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
            deletedAt: null,
          },
          select: VALUATION_SELECT_FULL,
        }),
      );
    }

    return this.mapValuation(
      await this.deps.db.investmentValuation.create({
        data: {
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

  mapValuation(
    valuation: Prisma.InvestmentValuationGetPayload<{
      select: typeof VALUATION_SELECT_FULL;
    }>,
  ) {
    return {
      ...valuation,
      price: valuation.price.toNumber(),
      timestamp: valuation.timestamp.toISOString(),
      fetchedAt: valuation.fetchedAt?.toISOString() ?? null,
      priceInBaseCurrency: valuation.priceInBaseCurrency?.toNumber() ?? null,
      exchangeRate: valuation.exchangeRate?.toNumber() ?? null,
      createdAt: valuation.createdAt.toISOString(),
      updatedAt: valuation.updatedAt.toISOString(),
    };
  }

  async listValuations(
    userId: string,
    investmentId: string,
    query: IListInvestmentValuationsQueryDto = {},
  ) {
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

    const {
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
      valuations: valuations.map(this.mapValuation),
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
      where: { userId, investmentId, deletedAt: null },
      orderBy: { timestamp: 'desc' },
      select: VALUATION_SELECT_FULL,
    });

    if (!valuation) {
      return null;
    }
    return this.mapValuation(valuation);
  }

  async deleteValuation(
    userId: string,
    investmentId: string,
    valuationId: string,
  ) {
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

    const valuation = await this.deps.db.investmentValuation.findFirst({
      where: {
        id: valuationId,
        userId,
        investmentId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!valuation) {
      throwAppError(ErrorCode.VALUATION_NOT_FOUND, 'Valuation not found');
    }

    await this.deps.db.investmentValuation.update({
      where: { id: valuationId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Valuation deleted successfully' };
  }
}

export const investmentValuationService = new InvestmentValuationService();
