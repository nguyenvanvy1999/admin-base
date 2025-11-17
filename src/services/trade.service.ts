import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  InvestmentTradeWhereInput,
  Prisma,
  TradeSide,
} from '@server/generated';
import {
  type TradeRepository,
  tradeRepository,
} from '@server/repositories/trade.repository';
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
  ICreateInvestmentTradeDto,
  IListInvestmentTradesQueryDto,
  InvestmentTradeListResponse,
  InvestmentTradeResponse,
} from '../dto/trade.dto';
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
import { TRADE_SELECT_FULL } from './selects';

type TradeRecord = Prisma.InvestmentTradeGetPayload<{
  select: typeof TRADE_SELECT_FULL;
}>;

export class TradeService extends BaseService<
  TradeRecord,
  ICreateInvestmentTradeDto,
  InvestmentTradeResponse,
  InvestmentTradeListResponse,
  TradeRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: TradeRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
      accountBalanceService: AccountBalanceService;
    } = {
      db: prisma,
      repository: tradeRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
      accountBalanceService: accountBalanceService,
    },
  ) {
    super(deps, {
      entityName: 'Trade',
      dbPrefix: DB_PREFIX.TRADE,
    });
  }

  protected formatEntity(trade: TradeRecord): InvestmentTradeResponse {
    return {
      ...trade,
      timestamp: dateFormatter.toIsoStringRequired(trade.timestamp),
      price: decimalFormatter.toString(trade.price),
      quantity: decimalFormatter.toString(trade.quantity),
      amount: decimalFormatter.toString(trade.amount),
      fee: decimalFormatter.toString(trade.fee),
      priceInBaseCurrency: decimalFormatter.toNullableString(
        trade.priceInBaseCurrency,
      ),
      amountInBaseCurrency: decimalFormatter.toNullableString(
        trade.amountInBaseCurrency,
      ),
      exchangeRate: decimalFormatter.toNullableString(trade.exchangeRate),
      priceFetchedAt: dateFormatter.toIsoString(trade.priceFetchedAt),
      created: dateFormatter.toIsoStringRequired(trade.created),
      modified: dateFormatter.toIsoStringRequired(trade.modified),
    };
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throwAppError(ErrorCode.INVALID_DATE, 'Invalid date provided');
    }
    return date;
  }

  // `upsert` is not applicable for trades, as they are immutable records.
  // We use `create` instead.
  async upsert(
    userId: string,
    data: ICreateInvestmentTradeDto & { investmentId: string },
  ): Promise<InvestmentTradeResponse> {
    return this.createTrade(userId, data.investmentId, data);
  }

  async createTrade(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentTradeDto,
  ): Promise<InvestmentTradeResponse> {
    await investmentService.validateTrade(userId, investmentId, data);

    const timestamp = this.parseDate(data.timestamp);
    const priceFetchedAt = data.priceFetchedAt
      ? this.parseDate(data.priceFetchedAt)
      : undefined;

    if (data.transactionId) {
      await this.deps.ownershipValidator.validateTransactionOwnership(
        userId,
        data.transactionId,
      );
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
          id: this.deps.idUtil.dbId(this.config.dbPrefix),
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
          meta: data.meta as any,
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

      return this.formatEntity(trade);
    });
  }

  async list(
    userId: string,
    query: IListInvestmentTradesQueryDto & { investmentId: string },
  ): Promise<InvestmentTradeListResponse> {
    await investmentService.ensureInvestment(userId, query.investmentId);

    const { side, accountIds, dateFrom, dateTo, page, limit, sortOrder } =
      query;

    const where: InvestmentTradeWhereInput = {
      userId,
      investmentId: query.investmentId,
    };

    if (side) where.side = side as TradeSide;
    if (accountIds?.length) where.accountId = { in: accountIds };

    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom ? { gte: this.parseDate(dateFrom) } : {}),
        ...(dateTo ? { lte: this.parseDate(dateTo) } : {}),
      };
    }

    const skip = this.calculateSkip(page, limit);

    const [trades, total] = await Promise.all([
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
      trades: trades.map((t) => this.formatEntity(t)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }

  async deleteManyTrades(
    userId: string,
    investmentId: string,
    tradeIds: string[],
  ) {
    await investmentService.ensureInvestment(userId, investmentId);

    const trades = await this.deps.db.investmentTrade.findMany({
      where: { id: { in: tradeIds }, userId, investmentId },
      select: TRADE_SELECT_FULL,
    });

    if (trades.length !== tradeIds.length) {
      throwAppError(
        ErrorCode.TRADE_NOT_FOUND,
        'Some trades were not found or do not belong to you',
      );
    }

    return this.deps.db.$transaction(async (tx) => {
      for (const trade of trades) {
        await this.deps.accountBalanceService.revertTradeBalance(
          tx,
          trade.side,
          trade.accountId,
          trade.amount,
          trade.fee,
        );
      }

      await tx.investmentTrade.deleteMany({
        where: { id: { in: tradeIds }, userId, investmentId },
      });

      return {
        success: true,
        message: `${tradeIds.length} trade(s) deleted successfully`,
      };
    });
  }

  // Legacy Methods
  async listTrades(
    userId: string,
    investmentId: string,
    query: IListInvestmentTradesQueryDto,
  ): Promise<InvestmentTradeListResponse> {
    return this.list(userId, { ...query, investmentId });
  }
}

export const tradeService = new TradeService();
