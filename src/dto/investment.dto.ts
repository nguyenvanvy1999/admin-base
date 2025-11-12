import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';

export const UpsertInvestmentDto = z.object({
  id: z.string().optional(),
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetType: z.nativeEnum(InvestmentAssetType),
  mode: z.nativeEnum(InvestmentMode).optional(),
  currencyId: z.string().min(1),
  baseCurrencyId: z.string().optional(),
  extra: z.any().optional(),
});

export const ListInvestmentsQueryDto = z.object({
  assetTypes: z.array(z.nativeEnum(InvestmentAssetType)).optional(),
  modes: z.array(z.nativeEnum(InvestmentMode)).optional(),
  currencyIds: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).default(20).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type IUpsertInvestmentDto = z.infer<typeof UpsertInvestmentDto>;
export type IListInvestmentsQueryDto = z.infer<typeof ListInvestmentsQueryDto>;

const investmentCurrencyShape = {
  id: t.String(),
  code: t.String(),
  name: t.String(),
  symbol: t.Nullable(t.String()),
} as const;

export const InvestmentCurrencyDto = t.NoValidate(
  t.Object(investmentCurrencyShape),
);

export const InvestmentDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    symbol: t.String(),
    name: t.String(),
    assetType: t.Enum(InvestmentAssetType),
    mode: t.Enum(InvestmentMode),
    currencyId: t.String(),
    baseCurrencyId: t.Nullable(t.String()),
    extra: t.Nullable(t.Any()),
    deletedAt: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
    currency: InvestmentCurrencyDto,
    baseCurrency: t.Nullable(InvestmentCurrencyDto),
  }),
);

export const InvestmentPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const InvestmentListResponseDto = t.NoValidate(
  t.Object({
    investments: t.Array(InvestmentDto),
    pagination: InvestmentPaginationDto,
  }),
);

export const InvestmentPositionDto = t.NoValidate(
  t.Object({
    quantity: t.Nullable(t.Number()),
    avgCost: t.Nullable(t.Number()),
    costBasis: t.Number(),
    realizedPnl: t.Number(),
    unrealizedPnl: t.Number(),
    lastPrice: t.Nullable(t.Number()),
    lastValue: t.Nullable(t.Number()),
    lastValuationAt: t.Nullable(t.String()),
    netContributions: t.Number(),
    costBasisInBaseCurrency: t.Optional(t.Number()),
    realizedPnlInBaseCurrency: t.Optional(t.Number()),
    unrealizedPnlInBaseCurrency: t.Optional(t.Number()),
    lastValueInBaseCurrency: t.Optional(t.Nullable(t.Number())),
    currentExchangeRate: t.Optional(t.Nullable(t.Number())),
    exchangeRateGainLoss: t.Optional(t.Nullable(t.Number())),
  }),
);

export const InvestmentLatestValuationDto = t.NoValidate(
  t.Object({
    id: t.String(),
    price: t.String(),
    timestamp: t.String(),
    currencyId: t.String(),
    source: t.Nullable(t.String()),
    fetchedAt: t.Nullable(t.String()),
    priceInBaseCurrency: t.Nullable(t.String()),
    exchangeRate: t.Nullable(t.String()),
  }),
);

export type InvestmentResponse = typeof InvestmentDto.static;
export type InvestmentListResponse = typeof InvestmentListResponseDto.static;
export type InvestmentPositionResponse = typeof InvestmentPositionDto.static;
export type InvestmentLatestValuationResponse =
  typeof InvestmentLatestValuationDto.static;
