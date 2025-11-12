import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  ICreateInvestmentTradeDto,
  IListInvestmentTradesQueryDto,
} from '../dto/trade.dto';
import { investmentServiceInstance } from './investment.service';
import { CURRENCY_SELECT_BASIC } from './selects';

const TRADE_SELECT = {
  id: true,
  userId: true,
  investmentId: true,
  accountId: true,
  side: true,
  timestamp: true,
  price: true,
  quantity: true,
  amount: true,
  fee: true,
  currencyId: true,
  transactionId: true,
  priceCurrency: true,
  priceInBaseCurrency: true,
  amountInBaseCurrency: true,
  exchangeRate: true,
  baseCurrencyId: true,
  priceSource: true,
  priceFetchedAt: true,
  meta: true,
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

export class InvestmentTradeService {
  private readonly investmentService = investmentServiceInstance;

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }
    return date;
  }

  private async validateTransactionOwnership(
    userId: string,
    transactionId: string,
  ) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      select: { id: true },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }
  }

  async createTrade(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentTradeDto,
  ) {
    await this.investmentService.validateTrade(userId, investmentId, data);

    const timestamp = this.parseDate(data.timestamp);
    const priceFetchedAt = data.priceFetchedAt
      ? this.parseDate(data.priceFetchedAt)
      : undefined;

    if (data.transactionId) {
      await this.validateTransactionOwnership(userId, data.transactionId);
    }

    return prisma.investmentTrade.create({
      data: {
        userId,
        investmentId,
        accountId: data.accountId,
        side: data.side,
        timestamp,
        price: data.price,
        quantity: data.quantity,
        amount: data.amount,
        fee: data.fee ?? 0,
        currencyId: data.currencyId,
        transactionId: data.transactionId ?? null,
        priceCurrency: data.priceCurrency ?? null,
        priceInBaseCurrency: data.priceInBaseCurrency ?? null,
        amountInBaseCurrency: data.amountInBaseCurrency ?? null,
        exchangeRate: data.exchangeRate ?? null,
        baseCurrencyId: data.baseCurrencyId ?? null,
        priceSource: data.priceSource ?? null,
        priceFetchedAt: priceFetchedAt ?? null,
        meta: data.meta ?? null,
      },
      select: TRADE_SELECT,
    });
  }

  async listTrades(
    userId: string,
    investmentId: string,
    query: IListInvestmentTradesQueryDto = {},
  ) {
    await this.investmentService.ensureInvestment(userId, investmentId);

    const {
      side,
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

    if (side) {
      where.side = side;
    }

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

    const [trades, total] = await Promise.all([
      prisma.investmentTrade.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        skip,
        take: limit,
        select: TRADE_SELECT,
      }),
      prisma.investmentTrade.count({ where }),
    ]);

    return {
      trades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const investmentTradeServiceInstance = new InvestmentTradeService();

export default new Elysia().decorate(
  'investmentTradeService',
  investmentTradeServiceInstance,
);
