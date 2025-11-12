import { t } from 'elysia';
import { z } from 'zod';

export const UpsertInvestmentValuationDto = z.object({
  price: z.number().min(0),
  currencyId: z.string().min(1),
  timestamp: z.iso.datetime(),
  source: z.string().optional(),
  fetchedAt: z.iso.datetime().optional(),
  priceInBaseCurrency: z.number().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyId: z.string().optional(),
});

export const ListInvestmentValuationsQueryDto = z.object({
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).default(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type IUpsertInvestmentValuationDto = z.infer<
  typeof UpsertInvestmentValuationDto
>;
export type IListInvestmentValuationsQueryDto = z.infer<
  typeof ListInvestmentValuationsQueryDto
>;

export const InvestmentValuationCurrencyDto = t.NoValidate(
  t.Object({
    id: t.String(),
    code: t.String(),
    name: t.String(),
    symbol: t.Nullable(t.String()),
  }),
);

export const InvestmentValuationDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    investmentId: t.String(),
    currencyId: t.String(),
    price: t.Number(),
    priceInBaseCurrency: t.Nullable(t.Number()),
    exchangeRate: t.Nullable(t.Number()),
    baseCurrencyId: t.Nullable(t.String()),
    timestamp: t.String(),
    source: t.Nullable(t.String()),
    fetchedAt: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
    currency: InvestmentValuationCurrencyDto,
    baseCurrency: t.Nullable(InvestmentValuationCurrencyDto),
  }),
);

export const InvestmentValuationPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const InvestmentValuationListResponseDto = t.NoValidate(
  t.Object({
    valuations: t.Array(InvestmentValuationDto),
    pagination: InvestmentValuationPaginationDto,
  }),
);

export type InvestmentValuationResponse = typeof InvestmentValuationDto.static;
export type InvestmentValuationListResponse =
  typeof InvestmentValuationListResponseDto.static;
