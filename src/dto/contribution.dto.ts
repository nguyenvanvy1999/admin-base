import { ContributionType } from '@server/generated/prisma/enums';
import { t } from 'elysia';

export const CreateInvestmentContributionDto = t.Object({
  amount: t.Number(),
  currencyId: t.String(),
  type: t.Enum(ContributionType),
  timestamp: t.String({ format: 'date-time' }),
  accountId: t.Optional(t.String()),
  note: t.Optional(t.String()),
  amountInBaseCurrency: t.Optional(t.Number()),
  exchangeRate: t.Optional(t.Number()),
  baseCurrencyId: t.Optional(t.String()),
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

export const InvestmentContributionAccountDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
  }),
);

export const InvestmentContributionCurrencyDto = t.NoValidate(
  t.Object({
    id: t.String(),
    code: t.String(),
    name: t.String(),
    symbol: t.Nullable(t.String()),
  }),
);

export const InvestmentContributionDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    investmentId: t.String(),
    accountId: t.Nullable(t.String()),
    amount: t.Number(),
    currencyId: t.String(),
    type: t.Enum(ContributionType),
    amountInBaseCurrency: t.Nullable(t.Number()),
    exchangeRate: t.Nullable(t.Number()),
    baseCurrencyId: t.Nullable(t.String()),
    timestamp: t.String(),
    note: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
    account: t.Nullable(InvestmentContributionAccountDto),
    currency: InvestmentContributionCurrencyDto,
    baseCurrency: t.Nullable(InvestmentContributionCurrencyDto),
  }),
);

export const InvestmentContributionPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const InvestmentContributionListResponseDto = t.NoValidate(
  t.Object({
    contributions: t.Array(InvestmentContributionDto),
    pagination: InvestmentContributionPaginationDto,
  }),
);

export type InvestmentContributionResponse =
  typeof InvestmentContributionDto.static;
export type InvestmentContributionListResponse =
  typeof InvestmentContributionListResponseDto.static;
