import { InvestmentAssetType, InvestmentMode } from '@server/generated';
import { t } from 'elysia';
import { z } from 'zod';
import {
  CurrencyDto,
  createArrayPreprocess,
  createListQueryDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

export const UpsertInvestmentDto = z.object({
  id: z.string().optional(),
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetType: z.enum(InvestmentAssetType),
  mode: z.enum(InvestmentMode).optional(),
  currencyId: z.string().min(1),
  baseCurrencyId: z.string().optional(),
  extra: z.unknown().optional(),
});

export const ListInvestmentsQueryDto = createListQueryDto({
  assetTypes: createArrayPreprocess(z.enum(InvestmentAssetType)),
  modes: createArrayPreprocess(z.enum(InvestmentMode)),
  currencyIds: createArrayPreprocess(z.string()),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'created', 'modified']).optional(),
});

export type IUpsertInvestmentDto = z.infer<typeof UpsertInvestmentDto>;
export type IListInvestmentsQueryDto = z.infer<typeof ListInvestmentsQueryDto>;

export const InvestmentCurrencyDto = CurrencyDto;

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
    created: t.String(),
    modified: t.String(),
    currency: InvestmentCurrencyDto,
    baseCurrency: t.Nullable(InvestmentCurrencyDto),
  }),
);

export const InvestmentListResponseDto = t.NoValidate(
  t.Object({
    investments: t.Array(InvestmentDto),
    pagination: PaginationDto,
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

export const InvestmentDeleteResponseDto = DeleteResponseDto;

export type InvestmentResponse = typeof InvestmentDto.static;
export type InvestmentListResponse = typeof InvestmentListResponseDto.static;
export type InvestmentPositionResponse = typeof InvestmentPositionDto.static;
export type InvestmentLatestValuationResponse =
  typeof InvestmentLatestValuationDto.static;
