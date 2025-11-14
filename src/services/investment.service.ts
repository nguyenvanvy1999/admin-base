import { prisma } from '@server/configs/db';
import {
  type InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import type { InvestmentWhereInput } from '@server/generated/prisma/models/Investment';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import { Elysia } from 'elysia';
import type { ICreateInvestmentContributionDto } from '../dto/contribution.dto';
import type {
  IListInvestmentsQueryDto,
  InvestmentLatestValuationResponse,
  InvestmentResponse,
  IUpsertInvestmentDto,
} from '../dto/investment.dto';
import type { ICreateInvestmentTradeDto } from '../dto/trade.dto';
import type { IUpsertInvestmentValuationDto } from '../dto/valuation.dto';
import { investmentPositionServiceInstance } from './investment-position.service';
import { INVESTMENT_SELECT_FULL } from './selects';

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
      throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
    }
  }

  async ensureInvestment(userId: string, investmentId: string) {
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId,
        deletedAt: null,
      },
      select: INVESTMENT_SELECT_FULL,
    });

    if (!investment) {
      throwAppError(ErrorCode.INVESTMENT_NOT_FOUND, 'Investment not found');
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
      assetType: data.assetType,
      mode: data.mode ?? InvestmentMode.priced,
      currencyId: data.currencyId,
      baseCurrencyId: data.baseCurrencyId ?? null,
      extra: (data.extra ?? null) as any,
    };

    if (data.id) {
      const investment = await this.ensureInvestment(userId, data.id);
      const updated = await prisma.investment.update({
        where: { id: investment.id },
        data: payload,
        select: INVESTMENT_SELECT_FULL,
      });
      return serializeInvestment(updated);
    }

    const created = await prisma.investment.create({
      data: {
        ...payload,
        userId,
      },
      select: INVESTMENT_SELECT_FULL,
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
        select: INVESTMENT_SELECT_FULL,
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

  getPosition(userId: string, investmentId: string) {
    return investmentPositionServiceInstance.getPosition(userId, investmentId);
  }

  async validateTrade(
    userId: string,
    investmentId: string,
    data: ICreateInvestmentTradeDto,
  ) {
    const investment = await this.ensureInvestment(userId, investmentId);

    if (investment.mode !== InvestmentMode.priced) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Trades are only allowed for priced investments',
      );
    }

    if (investment.currencyId !== data.currencyId) {
      throwAppError(
        ErrorCode.INVALID_CURRENCY_MISMATCH,
        'Trade currency must match investment currency',
      );
    }

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
      select: { id: true, currencyId: true },
    });

    if (!account) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
    }

    if (!investment.baseCurrencyId) {
      if (account.currencyId !== investment.currencyId) {
        throwAppError(
          ErrorCode.INVALID_CURRENCY_MISMATCH,
          'Account currency must match investment currency',
        );
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
        throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
      }

      if (!investment.baseCurrencyId) {
        if (account.currencyId !== investment.currencyId) {
          throwAppError(
            ErrorCode.INVALID_CURRENCY_MISMATCH,
            'Account currency must match investment currency',
          );
        }
      }
    }

    if (investment.currencyId !== data.currencyId) {
      throwAppError(
        ErrorCode.INVALID_CURRENCY_MISMATCH,
        'Contribution currency must match investment currency',
      );
    }

    if (
      data.type === 'withdrawal' &&
      investment.mode === InvestmentMode.manual
    ) {
      const position = await investmentPositionServiceInstance.getPosition(
        userId,
        investmentId,
      );
      if (data.amount > position.costBasis) {
        throwAppError(
          ErrorCode.WITHDRAWAL_EXCEEDS_BALANCE,
          'Withdrawal amount exceeds current cost basis',
        );
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
      throwAppError(
        ErrorCode.INVALID_CURRENCY_MISMATCH,
        'Valuation currency must match investment currency',
      );
    }

    return investment;
  }

  async deleteInvestment(userId: string, investmentId: string) {
    await this.ensureInvestment(userId, investmentId);

    await prisma.investment.update({
      where: { id: investmentId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Investment deleted successfully' };
  }
}

export const investmentServiceInstance = new InvestmentService();

export default new Elysia().decorate(
  'investmentService',
  investmentServiceInstance,
);
