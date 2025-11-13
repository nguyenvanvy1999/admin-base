import type { Prisma } from '@server/generated/prisma/client';
import type { TradeSide } from '@server/generated/prisma/enums';
import type { InvestmentTradeWhereInput } from '@server/generated/prisma/models';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  ICreateInvestmentTradeDto,
  IListInvestmentTradesQueryDto,
} from '../dto/trade.dto';
import { accountBalanceServiceInstance } from './account-balance.service';
import { investmentServiceInstance } from './investment.service';
import { CURRENCY_SELECT_BASIC, TRADE_SELECT_MINIMAL } from './selects';

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
  createdAt: true,
  updatedAt: true,
} as const;

const mapTrade = (
  trade: Prisma.InvestmentTradeGetPayload<{
    select: typeof TRADE_SELECT;
  }>,
) => ({
  ...trade,
  timestamp: trade.timestamp.toISOString(),
  price: trade.price.toNumber(),
  quantity: trade.quantity.toNumber(),
  amount: trade.amount.toNumber(),
  fee: trade.fee.toNumber(),
  priceInBaseCurrency: trade.priceInBaseCurrency?.toNumber() ?? null,
  amountInBaseCurrency: trade.amountInBaseCurrency?.toNumber() ?? null,
  exchangeRate: trade.exchangeRate?.toNumber() ?? null,
  priceFetchedAt: trade.priceFetchedAt?.toISOString() ?? null,
  createdAt: trade.createdAt.toISOString(),
  updatedAt: trade.updatedAt.toISOString(),
});

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

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
      select: { id: true, currencyId: true },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return prisma.$transaction(async (tx) => {
      const trade = await tx.investmentTrade.create({
        data: {
          userId,
          investmentId,
          accountId: data.accountId,
          side: data.side as TradeSide,
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
          meta: (data.meta ?? null) as any,
        },
        select: TRADE_SELECT,
      });

      await accountBalanceServiceInstance.applyTradeBalance(
        tx,
        data.side as TradeSide,
        data.accountId,
        data.amount,
        data.fee ?? 0,
      );

      return mapTrade(trade);
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

    const where: InvestmentTradeWhereInput = {
      userId,
      investmentId,
      deletedAt: null,
    };

    if (side) {
      where.side = side as TradeSide;
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
      trades: trades.map(mapTrade),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteTrade(userId: string, investmentId: string, tradeId: string) {
    await this.investmentService.ensureInvestment(userId, investmentId);

    const trade = await prisma.investmentTrade.findFirst({
      where: {
        id: tradeId,
        userId,
        investmentId,
        deletedAt: null,
      },
      select: TRADE_SELECT_MINIMAL,
    });

    if (!trade) {
      throw new Error('Trade not found');
    }

    return prisma.$transaction(async (tx) => {
      await accountBalanceServiceInstance.revertTradeBalance(
        tx,
        trade.side,
        trade.accountId,
        trade.amount,
        trade.fee,
      );

      await tx.investmentTrade.update({
        where: { id: tradeId },
        data: { deletedAt: new Date() },
      });

      return { success: true, message: 'Trade deleted successfully' };
    });
  }
}

export const investmentTradeServiceInstance = new InvestmentTradeService();

export default new Elysia().decorate(
  'investmentTradeService',
  investmentTradeServiceInstance,
);
