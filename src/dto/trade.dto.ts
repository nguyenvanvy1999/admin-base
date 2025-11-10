import { TradeSide } from '@server/generated/prisma/enums';
import { t } from 'elysia';

export const CreateInvestmentTradeDto = t.Object({
  side: t.Enum(TradeSide),
  timestamp: t.String({ format: 'date-time' }),
  price: t.Number({ minimum: 0 }),
  quantity: t.Number({ minimum: 0 }),
  amount: t.Number(),
  fee: t.Optional(t.Number({ minimum: 0 })),
  currencyId: t.String(),
  accountId: t.String(),
  transactionId: t.Optional(t.String()),
  priceCurrency: t.Optional(t.String()),
  priceInBaseCurrency: t.Optional(t.Number()),
  priceSource: t.Optional(t.String()),
  priceFetchedAt: t.Optional(t.String({ format: 'date-time' })),
  meta: t.Optional(t.Any()),
});

export const ListInvestmentTradesQueryDto = t.Object({
  side: t.Optional(t.Enum(TradeSide)),
  accountIds: t.Optional(t.Array(t.String())),
  dateFrom: t.Optional(t.String({ format: 'date-time' })),
  dateTo: t.Optional(t.String({ format: 'date-time' })),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 50 })),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type ICreateInvestmentTradeDto = typeof CreateInvestmentTradeDto.static;
export type IListInvestmentTradesQueryDto =
  typeof ListInvestmentTradesQueryDto.static;
