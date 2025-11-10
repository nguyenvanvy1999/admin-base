import { t } from 'elysia';

export const CreateInvestmentContributionDto = t.Object({
  amount: t.Number(),
  currencyId: t.String(),
  timestamp: t.String({ format: 'date-time' }),
  accountId: t.Optional(t.String()),
  note: t.Optional(t.String()),
});

export const ListInvestmentContributionsQueryDto = t.Object({
  accountIds: t.Optional(t.Array(t.String())),
  dateFrom: t.Optional(t.String({ format: 'date-time' })),
  dateTo: t.Optional(t.String({ format: 'date-time' })),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 50 })),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type ICreateInvestmentContributionDto =
  typeof CreateInvestmentContributionDto.static;
export type IListInvestmentContributionsQueryDto =
  typeof ListInvestmentContributionsQueryDto.static;
