import { prisma } from '@server/configs/db';
import type { InvestmentWhereInput } from '@server/generated';
import { type InvestmentAssetType, InvestmentMode } from '@server/generated';
import { DB_PREFIX, ErrorCode, idUtil, throwAppError } from '@server/share';
import { deleteManyResources } from '@server/share/utils/delete-many.util';
import { calculatePagination } from '@server/share/utils/pagination.util';
import type {
  IListInvestmentsQueryDto,
  InvestmentLatestValuationResponse,
  InvestmentResponse,
  IUpsertInvestmentDto,
} from '../dto/investment.dto';
import type { ICreateInvestmentTradeDto } from '../dto/trade.dto';
import type { IUpsertInvestmentValuationDto } from '../dto/valuation.dto';
import { BaseService } from './base/base.service';
import type { BaseServiceDependencies } from './base/service-dependencies';
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
  created: Date;
  modified: Date;
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
  created: investment.created.toISOString(),
  modified: investment.modified.toISOString(),
});

export class InvestmentService extends BaseService {
  constructor(deps: BaseServiceDependencies = { db: prisma, idUtil }) {
    super(deps);
  }

  private async ensureCurrency(currencyId: string) {
    const exists = await this.db.currency.findUnique({
      where: { id: currencyId },
      select: { id: true },
    });
    if (!exists) {
      throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
    }
  }

  async ensureInvestment(userId: string, investmentId: string) {
    this.validateOwnership(
      userId,
      investmentId,
      ErrorCode.INVESTMENT_NOT_FOUND,
      'Investment not found',
    );

    const investment = await this.db.investment.findFirst({
      where: {
        id: investmentId,
        userId,
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
      const updated = await this.db.investment.update({
        where: { id: investment.id },
        data: payload,
        select: INVESTMENT_SELECT_FULL,
      });
      return serializeInvestment(updated);
    }

    const created = await this.db.investment.create({
      data: {
        id: this.idUtil.dbIdWithUserId(DB_PREFIX.INVESTMENT, userId),
        ...payload,
        userId,
      },
      select: INVESTMENT_SELECT_FULL,
    });
    return serializeInvestment(created);
  }

  async listInvestments(userId: string, query: IListInvestmentsQueryDto) {
    const {
      assetTypes,
      modes,
      currencyIds,
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: InvestmentWhereInput = {
      userId,

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

    const orderBy = this.buildOrderBy(sortBy, sortOrder, {
      name: 'name',
      modified: 'modified',
      created: 'created',
    }) || { created: sortOrder };

    const { skip, take } = calculatePagination(page, limit);

    const [items, total] = await Promise.all([
      this.db.investment.findMany({
        where,
        orderBy,
        skip,
        take,
        select: INVESTMENT_SELECT_FULL,
      }),
      this.db.investment.count({ where }),
    ]);

    return {
      investments: items.map((investment) => serializeInvestment(investment)),
      pagination: this.buildPaginationResponse(page, limit, total, [])
        .pagination,
    };
  }

  async getInvestment(userId: string, investmentId: string) {
    const investment = await this.ensureInvestment(userId, investmentId);
    return serializeInvestment(investment);
  }

  getLatestValuation(userId: string, investmentId: string) {
    return this.db.investmentValuation
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

    const account = await this.db.account.findFirst({
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

  deleteManyInvestments(userId: string, ids: string[]) {
    return deleteManyResources({
      db: this.db,
      model: 'investment',
      userId,
      ids,
      selectMinimal: { id: true },
      errorCode: ErrorCode.INVESTMENT_NOT_FOUND,
      errorMessage: 'Some investments were not found or do not belong to you',
      resourceName: 'investment',
    });
  }
}

export const investmentService = new InvestmentService();
