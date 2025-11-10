import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { t } from 'elysia';

export const UpsertInvestmentDto = t.Object({
  id: t.Optional(t.String()),
  symbol: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  assetType: t.Enum(InvestmentAssetType),
  mode: t.Optional(t.Enum(InvestmentMode)),
  currencyId: t.String(),
  extra: t.Optional(t.Any()),
});

export const ListInvestmentsQueryDto = t.Object({
  assetTypes: t.Optional(t.Array(t.Enum(InvestmentAssetType))),
  modes: t.Optional(t.Array(t.Enum(InvestmentMode))),
  currencyIds: t.Optional(t.Array(t.String())),
  search: t.Optional(t.String()),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 20 })),
  sortBy: t.Optional(
    t.Union([
      t.Literal('name'),
      t.Literal('createdAt'),
      t.Literal('updatedAt'),
    ]),
  ),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertInvestmentDto = typeof UpsertInvestmentDto.static;
export type IListInvestmentsQueryDto = typeof ListInvestmentsQueryDto.static;

const investmentCurrencyShape = {
  id: t.String(),
  code: t.String(),
  name: t.String(),
  symbol: t.Nullable(t.String()),
} as const;

export const InvestmentCurrencyDto = t.Object(investmentCurrencyShape);

export const InvestmentDto = t.Object({
  id: t.String(),
  userId: t.String(),
  symbol: t.String(),
  name: t.String(),
  assetType: t.Enum(InvestmentAssetType),
  mode: t.Enum(InvestmentMode),
  currencyId: t.String(),
  extra: t.Nullable(t.Any()),
  deletedAt: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
  currency: InvestmentCurrencyDto,
});

export const InvestmentPaginationDto = t.Object({
  page: t.Integer(),
  limit: t.Integer(),
  total: t.Integer(),
  totalPages: t.Integer(),
});

export const InvestmentListResponseDto = t.Object({
  investments: t.Array(InvestmentDto),
  pagination: InvestmentPaginationDto,
});

export const InvestmentPositionDto = t.Object({
  quantity: t.Nullable(t.Number()),
  avgCost: t.Nullable(t.Number()),
  costBasis: t.Number(),
  realizedPnl: t.Number(),
  unrealizedPnl: t.Number(),
  lastPrice: t.Nullable(t.Number()),
  lastValue: t.Nullable(t.Number()),
  lastValuationAt: t.Nullable(t.String()),
  netContributions: t.Number(),
});

export const InvestmentLatestValuationDto = t.Object({
  id: t.String(),
  price: t.String(),
  timestamp: t.String(),
  currencyId: t.String(),
  source: t.Nullable(t.String()),
  fetchedAt: t.Nullable(t.String()),
});

export type InvestmentResponse = typeof InvestmentDto.static;
export type InvestmentListResponse = typeof InvestmentListResponseDto.static;
export type InvestmentPositionResponse = typeof InvestmentPositionDto.static;
export type InvestmentLatestValuationResponse =
  typeof InvestmentLatestValuationDto.static;
