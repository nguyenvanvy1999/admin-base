import { t } from 'elysia';

export const UpsertInvestmentValuationDto = t.Object({
  price: t.Number({ minimum: 0 }),
  currencyId: t.String(),
  timestamp: t.String({ format: 'date-time' }),
  source: t.Optional(t.String()),
  fetchedAt: t.Optional(t.String({ format: 'date-time' })),
});

export const ListInvestmentValuationsQueryDto = t.Object({
  dateFrom: t.Optional(t.String({ format: 'date-time' })),
  dateTo: t.Optional(t.String({ format: 'date-time' })),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 50 })),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertInvestmentValuationDto =
  typeof UpsertInvestmentValuationDto.static;
export type IListInvestmentValuationsQueryDto =
  typeof ListInvestmentValuationsQueryDto.static;

export const InvestmentValuationCurrencyDto = t.Object({
  id: t.String(),
  code: t.String(),
  name: t.String(),
  symbol: t.Nullable(t.String()),
});

export const InvestmentValuationDto = t.Object({
  id: t.String(),
  userId: t.String(),
  investmentId: t.String(),
  currencyId: t.String(),
  price: t.Number(),
  timestamp: t.String(),
  source: t.Nullable(t.String()),
  fetchedAt: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
  currency: InvestmentValuationCurrencyDto,
});

export const InvestmentValuationPaginationDto = t.Object({
  page: t.Integer(),
  limit: t.Integer(),
  total: t.Integer(),
  totalPages: t.Integer(),
});

export const InvestmentValuationListResponseDto = t.Object({
  valuations: t.Array(InvestmentValuationDto),
  pagination: InvestmentValuationPaginationDto,
});

export type InvestmentValuationResponse = typeof InvestmentValuationDto.static;
export type InvestmentValuationListResponse =
  typeof InvestmentValuationListResponseDto.static;
