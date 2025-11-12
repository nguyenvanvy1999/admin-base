import { ContributionType } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';

export const CreateInvestmentContributionDto = z.object({
  amount: z.number(),
  currencyId: z.string().min(1),
  type: z.nativeEnum(ContributionType),
  timestamp: z.string().datetime(),
  accountId: z.string().optional(),
  note: z.string().optional(),
  amountInBaseCurrency: z.number().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyId: z.string().optional(),
});

export const ListInvestmentContributionsQueryDto = z.object({
  accountIds: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).default(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ICreateInvestmentContributionDto = z.infer<
  typeof CreateInvestmentContributionDto
>;
export type IListInvestmentContributionsQueryDto = z.infer<
  typeof ListInvestmentContributionsQueryDto
>;

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
