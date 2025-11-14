import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import {
  ContributionType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import Elysia from 'elysia';
import type { InvestmentPositionResponse } from '../dto/investment.dto';
import {
  type InvestmentService,
  investmentServiceInstance,
} from './investment.service';
import {
  CONTRIBUTION_SELECT_FOR_POSITION,
  TRADE_SELECT_FOR_POSITION,
} from './selects';

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

export class InvestmentPositionService {
  constructor(
    private readonly deps: {
      db: IDb;
      investmentService: InvestmentService;
    } = {
      db: prisma,
      investmentService: investmentServiceInstance,
    },
  ) {}

  calculatePricedPosition(
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
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Sell quantity exceeds current position',
        );
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
        realizedPnlInBaseCurrency += tradeAmountInBase - costOfSoldInBase;
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
      currentExchangeRate !== null
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

  calculateManualPosition(
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
          throwAppError(
            ErrorCode.WITHDRAWAL_EXCEEDS_BALANCE,
            'Withdrawal exceeds current cost basis',
          );
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
      currentValueInBase !== null
        ? Number((currentValueInBase - costBasisInBaseCurrency).toFixed(2))
        : undefined;

    const exchangeRateGainLoss =
      currentExchangeRate !== null
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

  async getPosition(
    userId: string,
    investmentId: string,
  ): Promise<InvestmentPositionResponse> {
    const investment = await this.deps.investmentService.ensureInvestment(
      userId,
      investmentId,
    );

    if (investment.mode === InvestmentMode.priced) {
      const [trades, valuation] = await Promise.all([
        this.deps.db.investmentTrade.findMany({
          where: { userId, investmentId, deletedAt: null },
          orderBy: { timestamp: 'asc' },
          select: TRADE_SELECT_FOR_POSITION,
        }),
        this.deps.investmentService.getLatestValuation(userId, investmentId),
      ]);
      const position = this.calculatePricedPosition(
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
      };
    }

    const [contributions, valuation] = await Promise.all([
      this.deps.db.investmentContribution.findMany({
        where: { userId, investmentId, deletedAt: null },
        orderBy: { timestamp: 'asc' },
        select: CONTRIBUTION_SELECT_FOR_POSITION,
      }),
      this.deps.investmentService.getLatestValuation(userId, investmentId),
    ]);

    const position = this.calculateManualPosition(
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
    };
  }
}

export const investmentPositionServiceInstance =
  new InvestmentPositionService();

export default new Elysia().decorate(
  'investmentPositionService',
  investmentPositionServiceInstance,
);
