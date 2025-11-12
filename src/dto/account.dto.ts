import { AccountType } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';

export const UpsertAccountDto = z.object({
  id: z.string().optional(),
  type: z.enum(Object.values(AccountType) as [string, ...string[]]),
  name: z.string().min(1),
  currencyId: z.string().min(1),
  initialBalance: z.number().optional(),
  creditLimit: z.number().min(0).optional(),
  notifyOnDueDate: z.boolean().optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  notifyDaysBefore: z.number().int().min(0).optional(),
  meta: z.unknown().optional(),
});

export const ListAccountsQueryDto = z.object({
  type: z
    .array(z.enum(Object.values(AccountType) as [string, ...string[]]))
    .optional(),
  currencyId: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).default(20).optional(),
  sortBy: z.enum(['name', 'createdAt', 'balance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type IUpsertAccountDto = z.infer<typeof UpsertAccountDto>;
export type IListAccountsQueryDto = z.infer<typeof ListAccountsQueryDto>;

const accountCurrencyShape = {
  id: t.String(),
  code: t.String(),
  name: t.String(),
  symbol: t.Nullable(t.String()),
} as const;

export const AccountCurrencyDto = t.NoValidate(t.Object(accountCurrencyShape));

export const AccountDto = t.NoValidate(
  t.Object({
    id: t.String(),
    type: t.Enum(AccountType),
    name: t.String(),
    currencyId: t.String(),
    balance: t.String(),
    creditLimit: t.Nullable(t.String()),
    notifyOnDueDate: t.Nullable(t.Boolean()),
    paymentDay: t.Nullable(t.Integer()),
    notifyDaysBefore: t.Nullable(t.Integer()),
    meta: t.Nullable(t.Any()),
    createdAt: t.String(),
    updatedAt: t.String(),
    currency: AccountCurrencyDto,
  }),
);

export const AccountSummaryDto = t.NoValidate(
  t.Object({
    currency: AccountCurrencyDto,
    totalBalance: t.Number(),
  }),
);

export const AccountPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const AccountListResponseDto = t.NoValidate(
  t.Object({
    accounts: t.Array(AccountDto),
    pagination: AccountPaginationDto,
    summary: t.Array(AccountSummaryDto),
  }),
);

export const AccountDeleteResponseDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
);

export type AccountResponse = typeof AccountDto.static;
export type AccountSummary = typeof AccountSummaryDto.static;
export type AccountListResponse = typeof AccountListResponseDto.static;
export type AccountDeleteResponse = typeof AccountDeleteResponseDto.static;
