import { TradeSide } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';
import {
  CurrencyDto,
  createArrayPreprocess,
  createListQueryDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

export const CreateInvestmentTradeDto = z.object({
  side: z.enum(TradeSide),
  timestamp: z.iso.datetime(),
  price: z.number().min(0),
  quantity: z.number().min(0),
  amount: z.number(),
  fee: z.number().min(0).optional(),
  currencyId: z.string().min(1),
  accountId: z.string().min(1),
  transactionId: z.string().optional(),
  priceCurrency: z.string().optional(),
  priceInBaseCurrency: z.number().optional(),
  amountInBaseCurrency: z.number().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyId: z.string().optional(),
  priceSource: z.string().optional(),
  priceFetchedAt: z.iso.datetime().optional(),
  meta: z.unknown().optional(),
});

export const ListInvestmentTradesQueryDto = createListQueryDto({
  side: z.enum(TradeSide).optional(),
  accountIds: createArrayPreprocess(z.string()),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).default(50).optional(),
});

export type ICreateInvestmentTradeDto = z.infer<
  typeof CreateInvestmentTradeDto
>;
export type IListInvestmentTradesQueryDto = z.infer<
  typeof ListInvestmentTradesQueryDto
>;

export const InvestmentTradeAccountDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
  }),
);

export const InvestmentTradeCurrencyDto = CurrencyDto;

export const InvestmentTradeDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    investmentId: t.String(),
    accountId: t.String(),
    side: t.Enum(TradeSide),
    timestamp: t.String(),
    price: t.Number(),
    quantity: t.Number(),
    amount: t.Number(),
    fee: t.Number(),
    currencyId: t.String(),
    transactionId: t.Nullable(t.String()),
    priceCurrency: t.Nullable(t.String()),
    priceInBaseCurrency: t.Nullable(t.Number()),
    amountInBaseCurrency: t.Nullable(t.Number()),
    exchangeRate: t.Nullable(t.Number()),
    baseCurrencyId: t.Nullable(t.String()),
    priceSource: t.Nullable(t.String()),
    priceFetchedAt: t.Nullable(t.String()),
    meta: t.Nullable(t.Any()),
    account: InvestmentTradeAccountDto,
    currency: InvestmentTradeCurrencyDto,
    baseCurrency: t.Nullable(InvestmentTradeCurrencyDto),
  }),
);

export const InvestmentTradeListResponseDto = t.NoValidate(
  t.Object({
    trades: t.Array(InvestmentTradeDto),
    pagination: PaginationDto,
  }),
);

export const TradeDeleteResponseDto = DeleteResponseDto;

export type InvestmentTradeResponse = typeof InvestmentTradeDto.static;
export type InvestmentTradeListResponse =
  typeof InvestmentTradeListResponseDto.static;
