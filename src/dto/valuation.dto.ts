import { t } from 'elysia';
import { z } from 'zod';
import {
  CurrencyDto,
  createListQueryDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

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

export const ListInvestmentValuationsQueryDto = createListQueryDto({
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).default(50).optional(),
});

export type IUpsertInvestmentValuationDto = z.infer<
  typeof UpsertInvestmentValuationDto
>;
export type IListInvestmentValuationsQueryDto = z.infer<
  typeof ListInvestmentValuationsQueryDto
>;

export const InvestmentValuationCurrencyDto = CurrencyDto;

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
    created: t.String(),
    modified: t.String(),
    currency: InvestmentValuationCurrencyDto,
    baseCurrency: t.Nullable(InvestmentValuationCurrencyDto),
  }),
);

export const InvestmentValuationListResponseDto = t.NoValidate(
  t.Object({
    valuations: t.Array(InvestmentValuationDto),
    pagination: PaginationDto,
  }),
);

export const ValuationDeleteResponseDto = DeleteResponseDto;

export type InvestmentValuationResponse = typeof InvestmentValuationDto.static;
export type InvestmentValuationListResponse =
  typeof InvestmentValuationListResponseDto.static;
