import type { Prisma } from '@server/generated/prisma/client';
import { TradeSide } from '@server/generated/prisma/enums';
import type { InvestmentTradeWhereInput } from '@server/generated/prisma/models';
import { prisma } from '@server/libs/db';
import Decimal from 'decimal.js';
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

      // Update account balance based on trade side
      // Buy: deduct amount + fee from account (money goes out)
      // Sell: add amount - fee to account (money comes in)
      const amountDecimal = new Decimal(data.amount);
      const feeDecimal = new Decimal(data.fee ?? 0);

      if (data.side === TradeSide.buy) {
        // Buying: deduct total cost (amount + fee) from account
        const totalCost = amountDecimal.plus(feeDecimal);
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              decrement: totalCost.toNumber(),
            },
          },
        });
      } else {
        // Selling: add proceeds (amount - fee) to account
        const proceeds = amountDecimal.minus(feeDecimal);
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              increment: proceeds.toNumber(),
            },
          },
        });
      }

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
      trades: trades.map(mapTrade),
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
