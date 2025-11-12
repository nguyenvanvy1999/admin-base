import {
  ContributionType,
  type InvestmentAssetType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';
import type { InvestmentWhereInput } from '@server/generated/prisma/models/Investment';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type { ICreateInvestmentContributionDto } from '../dto/contribution.dto';
import type {
  IListInvestmentsQueryDto,
  InvestmentLatestValuationResponse,
  InvestmentPositionResponse,
  InvestmentResponse,
  IUpsertInvestmentDto,
} from '../dto/investment.dto';
import type { ICreateInvestmentTradeDto } from '../dto/trade.dto';
import type { IUpsertInvestmentValuationDto } from '../dto/valuation.dto';
import { CURRENCY_SELECT_BASIC } from './selects';

type TradeLike = {
  side: TradeSide;
  quantity: unknown;
  amount: unknown;
  fee: unknown;
  price: unknown;
  amountInBaseCurrency?: unknown;
  exchangeRate?: unknown;
};

type ContributionLike = {
  amount: unknown;
  type: ContributionType;
  amountInBaseCurrency?: unknown;
  exchangeRate?: unknown;
};

type ValuationLike = {
  price: unknown;
  timestamp: Date;
  priceInBaseCurrency?: unknown;
  exchangeRate?: unknown;
};

const INVESTMENT_SELECT_BASE = {
  id: true,
  userId: true,
  symbol: true,
  name: true,
  assetType: true,
  mode: true,
  currencyId: true,
  baseCurrencyId: true,
  extra: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
  baseCurrency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

type PositionResult = {
  quantity: number | null;
  avgCost: number | null;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  lastPrice: number | null;
  lastValue: number | null;
  lastValuationAt: Date | null;
  netContributions: number;
  costBasisInBaseCurrency?: number;
  realizedPnlInBaseCurrency?: number;
  unrealizedPnlInBaseCurrency?: number;
  lastValueInBaseCurrency?: number | null;
  currentExchangeRate?: number | null;
  exchangeRateGainLoss?: number | null;
};

const safeNumber = (value: unknown) =>
  value && typeof value === 'object' && 'toNumber' in value
    ? (value as any).toNumber()
    : Number(value ?? 0);

const serializeInvestment = (investment: {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  mode: InvestmentMode;
  currencyId: string;
  baseCurrencyId: string | null;
  extra: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
  };
  baseCurrency: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
  } | null;
}): InvestmentResponse => ({
  ...investment,
  extra: investment.extra ?? null,
  deletedAt: investment.deletedAt ? investment.deletedAt.toISOString() : null,
  createdAt: investment.createdAt.toISOString(),
  updatedAt: investment.updatedAt.toISOString(),
});

export class InvestmentService {
  private async ensureCurrency(currencyId: string) {
    const exists = await prisma.currency.findUnique({
      where: { id: currencyId },
      select: { id: true },
    });
    if (!exists) {
      throw new Error('Currency not found');
    }
  }

  async ensureInvestment(userId: string, investmentId: string) {
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId,
        deletedAt: null,
      },
      select: INVESTMENT_SELECT_BASE,
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    return investment;
  }

  async upsertInvestment(userId: string, data: IUpsertInvestmentDto) {
    await this.ensureCurrency(data.currencyId);
    if (data.baseCurrencyId) {
      await this.ensureCurrency(data.baseCurrencyId);
    }

    const payload = {
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType as InvestmentAssetType,
      mode: (data.mode ?? InvestmentMode.priced) as InvestmentMode,
      currencyId: data.currencyId,
      baseCurrencyId: data.baseCurrencyId ?? null,
      extra: (data.extra ?? null) as any,
    };

    if (data.id) {
      const investment = await this.ensureInvestment(userId, data.id);
      const updated = await prisma.investment.update({
        where: { id: investment.id },
        data: payload,
        select: INVESTMENT_SELECT_BASE,
      });
      return serializeInvestment(updated);
    }

    const created = await prisma.investment.create({
      data: {
        ...payload,
        userId,
      },
      select: INVESTMENT_SELECT_BASE,
    });
    return serializeInvestment(created);
  }

  async listInvestments(userId: string, query: IListInvestmentsQueryDto = {}) {
    const {
      assetTypes,
      modes,
      currencyIds,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: InvestmentWhereInput = {
      userId,
      deletedAt: null,
      ...(assetTypes && assetTypes.length > 0
        ? { assetType: { in: assetTypes as InvestmentAssetType[] } }
        : {}),
      ...(modes && modes.length > 0
        ? { mode: { in: modes as InvestmentMode[] } }
        : {}),
      ...(currencyIds && currencyIds.length > 0
        ? { currencyId: { in: currencyIds } }
        : {}),
      ...(search && search.trim()
        ? {
            OR: [
              { name: { contains: search.trim(), mode: 'insensitive' } },
              { symbol: { contains: search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy =
      sortBy === 'name'
        ? { name: sortOrder }
        : sortBy === 'updatedAt'
          ? { updatedAt: sortOrder }
          : { createdAt: sortOrder };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: INVESTMENT_SELECT_BASE,
      }),
      prisma.investment.count({ where }),
    ]);

    return {
      investments: items.map((investment) => serializeInvestment(investment)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvestment(userId: string, investmentId: string) {
    const investment = await this.ensureInvestment(userId, investmentId);
    return serializeInvestment(investment);
  }

  getLatestValuation(userId: string, investmentId: string) {
    return prisma.investmentValuation
      .findFirst({
        where: {
          userId,
          investmentId,
        },
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          price: true,
          timestamp: true,
          currencyId: true,
          source: true,
          fetchedAt: true,
          priceInBaseCurrency: true,
          exchangeRate: true,
        },
      })
      .then((valuation) => {
        if (!valuation) {
          return null;
        }
        return {
          id: valuation.id,
          price: valuation.price.toString(),
          timestamp: valuation.timestamp.toISOString(),
          currencyId: valuation.currencyId,
          source: valuation.source,
          fetchedAt: valuation.fetchedAt
            ? valuation.fetchedAt.toISOString()
            : null,
          priceInBaseCurrency: valuation.priceInBaseCurrency
            ? valuation.priceInBaseCurrency.toString()
            : null,
          exchangeRate: valuation.exchangeRate
            ? valuation.exchangeRate.toString()
            : null,
        } satisfies InvestmentLatestValuationResponse & {
          priceInBaseCurrency: string | null;
          exchangeRate: string | null;
        };
      });
  }

  private computePricedPosition(
    trades: TradeLike[],
    valuation: ValuationLike | null,
  ): PositionResult {
    let quantity = 0;
    let costBasis = 0;
    let realizedPnl = 0;
    let netContributions = 0;
    let costBasisInBaseCurrency = 0;
    let realizedPnlInBaseCurrency = 0;

    for (const trade of trades) {
      const tradeQuantity = safeNumber(trade.quantity);
      const tradeAmount = safeNumber(trade.amount);
      const fee = safeNumber(trade.fee);
      const tradeAmountInBase = trade.amountInBaseCurrency
        ? safeNumber(trade.amountInBaseCurrency)
        : null;

      if (trade.side === TradeSide.buy) {
        quantity += tradeQuantity;
        const totalCost = tradeAmount + fee;
        costBasis += totalCost;
        netContributions += totalCost;
        if (tradeAmountInBase !== null) {
          costBasisInBaseCurrency += tradeAmountInBase;
        }
        continue;
      }

      if (tradeQuantity > quantity) {
        throw new Error('Sell quantity exceeds current position');
      }

      if (quantity === 0) {
        continue;
      }

      const averageCost = costBasis / quantity;
      const costOfSold = averageCost * tradeQuantity;
      const proceeds = tradeAmount - fee;

      realizedPnl += proceeds - costOfSold;
      netContributions -= proceeds;
      quantity -= tradeQuantity;
      costBasis -= costOfSold;

      if (tradeAmountInBase !== null && costBasisInBaseCurrency > 0) {
        const totalQuantityBeforeSell = quantity + tradeQuantity;
        const averageCostInBase =
          costBasisInBaseCurrency / totalQuantityBeforeSell;
        const costOfSoldInBase = averageCostInBase * tradeQuantity;
        const proceedsInBase = tradeAmountInBase;
        realizedPnlInBaseCurrency += proceedsInBase - costOfSoldInBase;
        costBasisInBaseCurrency -= costOfSoldInBase;
      } else if (tradeAmountInBase !== null) {
        realizedPnlInBaseCurrency += tradeAmountInBase;
      }
    }

    const lastPrice = valuation
      ? safeNumber(valuation.price)
      : trades.length > 0
        ? safeNumber(trades[trades.length - 1].price)
        : null;

    const lastValue =
      lastPrice !== null ? Number((quantity * lastPrice).toFixed(2)) : null;

    const unrealizedPnl =
      lastValue !== null ? Number((lastValue - costBasis).toFixed(2)) : 0;

    const lastValueInBaseCurrency = valuation?.priceInBaseCurrency
      ? safeNumber(valuation.priceInBaseCurrency) * quantity
      : null;
    const unrealizedPnlInBaseCurrency =
      lastValueInBaseCurrency !== null && costBasisInBaseCurrency > 0
        ? Number((lastValueInBaseCurrency - costBasisInBaseCurrency).toFixed(2))
        : undefined;

    const currentExchangeRate = valuation?.exchangeRate
      ? safeNumber(valuation.exchangeRate)
      : null;

    const exchangeRateGainLoss =
      currentExchangeRate !== null &&
      realizedPnl !== undefined &&
      realizedPnlInBaseCurrency !== undefined
        ? Number(
            (
              realizedPnlInBaseCurrency -
              realizedPnl * currentExchangeRate
            ).toFixed(2),
          )
        : undefined;

    return {
      quantity,
      avgCost: quantity > 0 ? Number((costBasis / quantity).toFixed(6)) : null,
      costBasis: Number(costBasis.toFixed(2)),
      realizedPnl: Number(realizedPnl.toFixed(2)),
      unrealizedPnl,
      lastPrice,
      lastValue,
      lastValuationAt: valuation?.timestamp ?? null,
      netContributions: Number(netContributions.toFixed(2)),
      costBasisInBaseCurrency:
        costBasisInBaseCurrency > 0
          ? Number(costBasisInBaseCurrency.toFixed(2))
          : undefined,
      realizedPnlInBaseCurrency:
        realizedPnlInBaseCurrency !== 0
          ? Number(realizedPnlInBaseCurrency.toFixed(2))
          : undefined,
      unrealizedPnlInBaseCurrency,
      lastValueInBaseCurrency:
        lastValueInBaseCurrency !== null
          ? Number(lastValueInBaseCurrency.toFixed(2))
          : undefined,
      currentExchangeRate:
        currentExchangeRate !== null
          ? Number(currentExchangeRate.toFixed(6))
          : undefined,
      exchangeRateGainLoss,
    };
  }

  private computeManualPosition(
    contributions: ContributionLike[],
    valuation: ValuationLike | null,
  ): PositionResult {
    let netContributions = 0;
    let realizedPnl = 0;
    let costBasisInBaseCurrency = 0;
    let realizedPnlInBaseCurrency = 0;

    for (const contribution of contributions) {
      const amount = safeNumber(contribution.amount);
      const amountInBase = contribution.amountInBaseCurrency
        ? safeNumber(contribution.amountInBaseCurrency)
        : null;

      if (contribution.type === ContributionType.deposit) {
        netContributions += amount;
        if (amountInBase !== null) {
          costBasisInBaseCurrency += amountInBase;
        }
      } else {
        if (netContributions === 0) {
          throw new Error('Withdrawal exceeds current cost basis');
        }

        const costBasisAtWithdrawal = netContributions;
        const withdrawalAmount = Math.abs(amount);
        const withdrawalRatio = withdrawalAmount / costBasisAtWithdrawal;

        const costBasisInBaseAtWithdrawal = costBasisInBaseCurrency;
        const withdrawalAmountInBase =
          amountInBase !== null ? Math.abs(amountInBase) : null;

        realizedPnl +=
          withdrawalAmount - costBasisAtWithdrawal * withdrawalRatio;
        netContributions -= costBasisAtWithdrawal * withdrawalRatio;

        if (
          withdrawalAmountInBase !== null &&
          costBasisInBaseAtWithdrawal > 0
        ) {
          const costBasisRatio =
            costBasisInBaseAtWithdrawal / costBasisAtWithdrawal;
          const costBasisInBaseForWithdrawal =
            costBasisAtWithdrawal * withdrawalRatio * costBasisRatio;
          realizedPnlInBaseCurrency +=
            withdrawalAmountInBase - costBasisInBaseForWithdrawal;
          costBasisInBaseCurrency -= costBasisInBaseForWithdrawal;
        } else if (withdrawalAmountInBase !== null) {
          realizedPnlInBaseCurrency += withdrawalAmountInBase;
        }
      }
    }

    const currentValue = valuation ? safeNumber(valuation.price) : null;
    const currentValueInBase = valuation?.priceInBaseCurrency
      ? safeNumber(valuation.priceInBaseCurrency)
      : null;
    const currentExchangeRate = valuation?.exchangeRate
      ? safeNumber(valuation.exchangeRate)
      : null;

    const unrealizedPnl =
      currentValue !== null
        ? Number((currentValue - netContributions).toFixed(2))
        : 0;

    const unrealizedPnlInBaseCurrency =
      currentValueInBase !== null && costBasisInBaseCurrency !== null
        ? Number((currentValueInBase - costBasisInBaseCurrency).toFixed(2))
        : undefined;

    const exchangeRateGainLoss =
      currentExchangeRate !== null &&
      realizedPnl !== undefined &&
      realizedPnlInBaseCurrency !== undefined
        ? Number(
            (
              realizedPnlInBaseCurrency -
              realizedPnl * currentExchangeRate
            ).toFixed(2),
          )
        : undefined;

    return {
      quantity: null,
      avgCost: null,
      costBasis: Number(netContributions.toFixed(2)),
      realizedPnl: Number(realizedPnl.toFixed(2)),
      unrealizedPnl,
      lastPrice: currentValue,
      lastValue: currentValue,
      lastValuationAt: valuation?.timestamp ?? null,
      netContributions: Number(netContributions.toFixed(2)),
      costBasisInBaseCurrency:
        costBasisInBaseCurrency > 0
          ? Number(costBasisInBaseCurrency.toFixed(2))
          : undefined,
      realizedPnlInBaseCurrency:
        realizedPnlInBaseCurrency !== 0
          ? Number(realizedPnlInBaseCurrency.toFixed(2))
          : undefined,
      unrealizedPnlInBaseCurrency,
      lastValueInBaseCurrency:
        currentValueInBase !== null
          ? Number(currentValueInBase.toFixed(2))
          : undefined,
      currentExchangeRate:
        currentExchangeRate !== null
          ? Number(currentExchangeRate.toFixed(6))
          : undefined,
      exchangeRateGainLoss,
    };
  }

  async getPosition(userId: string, investmentId: string) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (investment.mode === InvestmentMode.priced) {
      const [trades, valuation] = await Promise.all([
        prisma.investmentTrade.findMany({
          where: { userId, investmentId },
          orderBy: { timestamp: 'asc' },
          select: {
            side: true,
            quantity: true,
            amount: true,
            fee: true,
            price: true,
            amountInBaseCurrency: true,
            exchangeRate: true,
          },
        }),
        this.getLatestValuation(userId, investmentId),
      ]);
      const position = this.computePricedPosition(
        trades,
        valuation
          ? {
              timestamp: new Date(valuation.timestamp),
              price: valuation.price,
              priceInBaseCurrency: valuation.priceInBaseCurrency
                ? Number(valuation.priceInBaseCurrency)
                : undefined,
              exchangeRate: valuation.exchangeRate
                ? Number(valuation.exchangeRate)
                : undefined,
            }
          : null,
      );
      return {
        ...position,
        lastValuationAt: position.lastValuationAt
          ? position.lastValuationAt.toISOString()
          : null,
      } satisfies InvestmentPositionResponse;
    }

    const [contributions, valuation] = await Promise.all([
      prisma.investmentContribution.findMany({
        where: { userId, investmentId },
        orderBy: { timestamp: 'asc' },
        select: {
          amount: true,
          type: true,
          amountInBaseCurrency: true,
          exchangeRate: true,
        },
      }),
      this.getLatestValuation(userId, investmentId),
    ]);

    const position = this.computeManualPosition(
      contributions,
      valuation
        ? {
            timestamp: new Date(valuation.timestamp),
            price: valuation.price,
            priceInBaseCurrency: valuation.priceInBaseCurrency
              ? Number(valuation.priceInBaseCurrency)
              : undefined,
            exchangeRate: valuation.exchangeRate
              ? Number(valuation.exchangeRate)
              : undefined,
          }
        : null,
    );
    return {
      ...position,
      lastValuationAt: position.lastValuationAt
        ? position.lastValuationAt.toISOString()
        : null,
    } satisfies InvestmentPositionResponse;
  }

  async validateTrade(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentTradeDto,
  ) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (investment.mode !== InvestmentMode.priced) {
      throw new Error('Trades are only allowed for priced investments');
    }

    if (investment.currencyId !== data.currencyId) {
      throw new Error('Trade currency must match investment currency');
    }

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
      select: { id: true, currencyId: true },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (!investment.baseCurrencyId) {
      if (account.currencyId !== investment.currencyId) {
        throw new Error('Account currency must match investment currency');
      }
    }

    return investment;
  }

  async validateContribution(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentContributionDto,
  ) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, userId },
        select: { id: true, currencyId: true },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      if (!investment.baseCurrencyId) {
        if (account.currencyId !== investment.currencyId) {
          throw new Error('Account currency must match investment currency');
        }
      }
    }

    if (investment.currencyId !== data.currencyId) {
      throw new Error('Contribution currency must match investment currency');
    }

    if (
      data.type === 'withdrawal' &&
      investment.mode === InvestmentMode.manual
    ) {
      const position = await this.getPosition(userId, investmentId);
      if (data.amount > position.costBasis) {
        throw new Error('Withdrawal amount exceeds current cost basis');
      }
    }

    return investment;
  }

  async validateValuation(
    userId: string,
    investmentId: string,
    data: IUpsertInvestmentValuationDto,
  ) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (investment.currencyId !== data.currencyId) {
      throw new Error('Valuation currency must match investment currency');
    }

    return investment;
  }
}

export const investmentServiceInstance = new InvestmentService();

export default new Elysia().decorate(
  'investmentService',
  investmentServiceInstance,
);
