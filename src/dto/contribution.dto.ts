import { ContributionType } from '@server/generated';
import { t } from 'elysia';
import { z } from 'zod';
import {
  CurrencyDto,
  createArrayPreprocess,
  createListQueryDto,
  PaginationDto,
} from './common.dto';

export const CreateInvestmentContributionDto = z.object({
  amount: z.number(),
  currencyId: z.string().min(1),
  type: z.enum(ContributionType),
  timestamp: z.iso.datetime(),
  accountId: z.string().optional(),
  note: z.string().optional(),
  amountInBaseCurrency: z.number().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyId: z.string().optional(),
});

export const ListInvestmentContributionsQueryDto = createListQueryDto({
  accountIds: createArrayPreprocess(z.string()),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).optional().default(50),
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
    created: t.String(),
    modified: t.String(),
    account: t.Nullable(InvestmentContributionAccountDto),
    currency: CurrencyDto,
    baseCurrency: t.Nullable(CurrencyDto),
  }),
);

export const InvestmentContributionListResponseDto = t.NoValidate(
  t.Object({
    contributions: t.Array(InvestmentContributionDto),
    pagination: PaginationDto,
  }),
);

export type InvestmentContributionResponse =
  typeof InvestmentContributionDto.static;
export type InvestmentContributionListResponse =
  typeof InvestmentContributionListResponseDto.static;
