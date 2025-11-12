import type { Prisma } from '@server/generated/prisma/client';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  IListInvestmentValuationsQueryDto,
  IUpsertInvestmentValuationDto,
} from '../dto/valuation.dto';
import { investmentServiceInstance } from './investment.service';
import { CURRENCY_SELECT_BASIC } from './selects';

const VALUATION_SELECT = {
  id: true,
  userId: true,
  investmentId: true,
  currencyId: true,
  price: true,
  priceInBaseCurrency: true,
  exchangeRate: true,
  baseCurrencyId: true,
  timestamp: true,
  source: true,
  fetchedAt: true,
  createdAt: true,
  updatedAt: true,
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
  baseCurrency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

export class InvestmentValuationService {
  private readonly investmentService = investmentServiceInstance;

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }

    return date;
  }

  async upsertValuation(
    userId: string,
    investmentId: string,
    data: IUpsertInvestmentValuationDto,
  ) {
    await this.investmentService.validateValuation(userId, investmentId, data);

    const timestamp = this.parseDate(data.timestamp);
    const fetchedAt = data.fetchedAt ? this.parseDate(data.fetchedAt) : null;

    const existing = await prisma.investmentValuation.findFirst({
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
        await prisma.investmentValuation.update({
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
          select: VALUATION_SELECT,
        }),
      );
    }

    return this.mapValuation(
      await prisma.investmentValuation.create({
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
        select: VALUATION_SELECT,
      }),
    );
  }

  mapValuation(
    valuation: Prisma.InvestmentValuationGetPayload<{
      select: typeof VALUATION_SELECT;
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
    await this.investmentService.ensureInvestment(userId, investmentId);

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
      prisma.investmentValuation.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        skip,
        take: limit,
        select: VALUATION_SELECT,
      }),
      prisma.investmentValuation.count({ where }),
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
    await this.investmentService.ensureInvestment(userId, investmentId);

    const valuation = await prisma.investmentValuation.findFirst({
      where: { userId, investmentId, deletedAt: null },
      orderBy: { timestamp: 'desc' },
      select: VALUATION_SELECT,
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
    await this.investmentService.ensureInvestment(userId, investmentId);

    const valuation = await prisma.investmentValuation.findFirst({
      where: {
        id: valuationId,
        userId,
        investmentId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!valuation) {
      throw new Error('Valuation not found');
    }

    await prisma.investmentValuation.update({
      where: { id: valuationId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Valuation deleted successfully' };
  }
}

export const investmentValuationServiceInstance =
  new InvestmentValuationService();

export default new Elysia().decorate(
  'investmentValuationService',
  investmentValuationServiceInstance,
);
