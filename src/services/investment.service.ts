import { InvestmentMode, TradeSide } from '@server/generated/prisma/enums';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type { ICreateInvestmentContributionDto } from '../dto/contribution.dto';
import type {
  IListInvestmentsQueryDto,
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
};

type ContributionLike = {
  amount: unknown;
};

type ValuationLike = {
  price: unknown;
  timestamp: Date;
};

const INVESTMENT_SELECT_BASE = {
  id: true,
  userId: true,
  symbol: true,
  name: true,
  assetType: true,
  mode: true,
  currencyId: true,
  extra: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  currency: {
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
};

const safeNumber = (value: unknown) =>
  value && typeof value === 'object' && 'toNumber' in value
    ? // Prisma Decimal implements toNumber
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (value as any).toNumber()
    : Number(value ?? 0);

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

    const payload = {
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType,
      mode: data.mode ?? InvestmentMode.priced,
      currencyId: data.currencyId,
      extra: data.extra ?? null,
    };

    if (data.id) {
      const investment = await this.ensureInvestment(userId, data.id);
      return prisma.investment.update({
        where: { id: investment.id },
        data: payload,
        select: INVESTMENT_SELECT_BASE,
      });
    }

    return prisma.investment.create({
      data: {
        ...payload,
        userId,
      },
      select: INVESTMENT_SELECT_BASE,
    });
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

    const where = {
      userId,
      deletedAt: null,
      ...(assetTypes && assetTypes.length > 0
        ? { assetType: { in: assetTypes } }
        : {}),
      ...(modes && modes.length > 0 ? { mode: { in: modes } } : {}),
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
      investments: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  getInvestment(userId: string, investmentId: string) {
    return this.ensureInvestment(userId, investmentId);
  }

  getLatestValuation(userId: string, investmentId: string) {
    return prisma.investmentValuation.findFirst({
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
      },
    });
  }

  private computePricedPosition(
    trades: TradeLike[],
    valuation: ValuationLike | null,
  ): PositionResult {
    // Weighted average cost is used to value remaining quantity.
    let quantity = 0;
    let costBasis = 0;
    let realizedPnl = 0;
    let netContributions = 0;

    for (const trade of trades) {
      const tradeQuantity = safeNumber(trade.quantity);
      const tradeAmount = safeNumber(trade.amount);
      const fee = safeNumber(trade.fee);

      if (trade.side === TradeSide.buy) {
        quantity += tradeQuantity;
        costBasis += tradeAmount + fee;
        netContributions += tradeAmount + fee;
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
    };
  }

  private computeManualPosition(
    contributions: ContributionLike[],
    valuation: ValuationLike | null,
  ): PositionResult {
    let net = 0;
    for (const contribution of contributions) {
      net += safeNumber(contribution.amount);
    }

    const currentValue = valuation ? safeNumber(valuation.price) : null;
    const unrealizedPnl =
      currentValue !== null ? Number((currentValue - net).toFixed(2)) : 0;

    return {
      quantity: null,
      avgCost: null,
      costBasis: Number(net.toFixed(2)),
      realizedPnl: 0,
      unrealizedPnl,
      lastPrice: currentValue,
      lastValue: currentValue,
      lastValuationAt: valuation?.timestamp ?? null,
      netContributions: Number(net.toFixed(2)),
    };
  }

  async getPosition(userId: string, investmentId: string) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (investment.mode === InvestmentMode.priced) {
      const [trades, valuation] = await Promise.all([
        prisma.investmentTrade.findMany({
          where: { userId, investmentId },
          orderBy: { timestamp: 'asc' },
        }),
        this.getLatestValuation(userId, investmentId),
      ]);
      return this.computePricedPosition(trades, valuation);
    }

    const [contributions, valuation] = await Promise.all([
      prisma.investmentContribution.findMany({
        where: { userId, investmentId },
        orderBy: { timestamp: 'asc' },
      }),
      this.getLatestValuation(userId, investmentId),
    ]);

    return this.computeManualPosition(contributions, valuation);
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

    if (account.currencyId !== investment.currencyId) {
      throw new Error('Account currency must match investment currency');
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

      if (account.currencyId !== investment.currencyId) {
        throw new Error('Account currency must match investment currency');
      }
    }

    if (investment.currencyId !== data.currencyId) {
      throw new Error('Contribution currency must match investment currency');
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
