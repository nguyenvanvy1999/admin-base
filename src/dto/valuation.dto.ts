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
