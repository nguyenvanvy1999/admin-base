import { AccountType } from '@server/generated/prisma/enums';
import { t } from 'elysia';

export const UpsertAccountDto = t.Object({
  id: t.Optional(t.String()),
  type: t.Enum(AccountType),
  name: t.String(),
  currencyId: t.String(),
  initialBalance: t.Optional(t.Number()),
  creditLimit: t.Optional(t.Number({ minimum: 0 })),
  notifyOnDueDate: t.Optional(t.Boolean()),
  paymentDay: t.Optional(t.Integer({ minimum: 1, maximum: 31 })),
  notifyDaysBefore: t.Optional(t.Integer({ minimum: 0 })),
  meta: t.Optional(t.Any()),
});

export const ListAccountsQueryDto = t.Object({
  type: t.Optional(t.Array(t.Enum(AccountType))),
  currencyId: t.Optional(t.Array(t.String())),
  search: t.Optional(t.String()),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 20 })),
  sortBy: t.Optional(
    t.Union([t.Literal('name'), t.Literal('createdAt'), t.Literal('balance')]),
  ),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertAccountDto = typeof UpsertAccountDto.static;
export type IListAccountsQueryDto = typeof ListAccountsQueryDto.static;

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
