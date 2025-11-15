import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  InvestmentTradeWhereInput,
  Prisma,
  TradeSide,
} from '@server/generated';
import { ErrorCode, throwAppError } from '@server/share';
import type {
  ICreateInvestmentTradeDto,
  IListInvestmentTradesQueryDto,
} from '../dto/trade.dto';
import {
  type AccountBalanceService,
  accountBalanceService,
} from './account-balance.service';
import {
  type InvestmentService,
  investmentService,
} from './investment.service';
import { TRADE_SELECT_FULL } from './selects';

const mapTrade = (
  trade: Prisma.InvestmentTradeGetPayload<{
    select: typeof TRADE_SELECT_FULL;
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
  constructor(
    private readonly deps: {
      db: IDb;
      investmentService: InvestmentService;
      accountBalanceService: AccountBalanceService;
    } = {
      db: prisma,
      investmentService: investmentService,
      accountBalanceService: accountBalanceService,
    },
  ) {}

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throwAppError(ErrorCode.INVALID_DATE, 'Invalid date provided');
    }
    return date;
  }

  private async validateTransactionOwnership(
    userId: string,
    transactionId: string,
  ) {
    const transaction = await this.deps.db.transaction.findFirst({
      where: { id: transactionId, userId },
      select: { id: true },
    });

    if (!transaction) {
      throwAppError(ErrorCode.NOT_FOUND, 'Transaction not found');
    }
  }

  async createTrade(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentTradeDto,
  ) {
    await this.deps.investmentService.validateTrade(userId, investmentId, data);

    const timestamp = this.parseDate(data.timestamp);
    const priceFetchedAt = data.priceFetchedAt
      ? this.parseDate(data.priceFetchedAt)
      : undefined;

    if (data.transactionId) {
      await this.validateTransactionOwnership(userId, data.transactionId);
    }

    const account = await this.deps.db.account.findFirst({
      where: { id: data.accountId, userId },
      select: { id: true, currencyId: true },
    });

    if (!account) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
    }

    return this.deps.db.$transaction(async (tx) => {
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
        select: TRADE_SELECT_FULL,
      });

      await this.deps.accountBalanceService.applyTradeBalance(
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
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

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
      this.deps.db.investmentTrade.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        skip,
        take: limit,
        select: TRADE_SELECT_FULL,
      }),
      this.deps.db.investmentTrade.count({ where }),
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
    await this.deps.investmentService.ensureInvestment(userId, investmentId);

    const trade = await this.deps.db.investmentTrade.findFirst({
      where: {
        id: tradeId,
        userId,
        investmentId,
        deletedAt: null,
      },
      select: TRADE_SELECT_FULL,
    });

    if (!trade) {
      throwAppError(ErrorCode.TRADE_NOT_FOUND, 'Trade not found');
    }

    return this.deps.db.$transaction(async (tx) => {
      await this.deps.accountBalanceService.revertTradeBalance(
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

export const investmentTradeService = new InvestmentTradeService();
