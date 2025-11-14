import { AccountType } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';
import {
  CurrencyDto,
  createArrayPreprocess,
  createListQueryDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

export const UpsertAccountDto = z.object({
  id: z.string().optional(),
  type: z.enum(AccountType),
  name: z.string().min(1),
  currencyId: z.string().min(1),
  initialBalance: z.number().optional(),
  creditLimit: z.number().min(0).optional(),
  notifyOnDueDate: z.boolean().optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  notifyDaysBefore: z.number().int().min(0).optional(),
  meta: z.unknown().optional(),
});

export const ListAccountsQueryDto = createListQueryDto({
  type: createArrayPreprocess(z.enum(AccountType)),
  currencyId: createArrayPreprocess(z.string()),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'balance']).optional(),
});

export type IUpsertAccountDto = z.infer<typeof UpsertAccountDto>;
export type IListAccountsQueryDto = z.infer<typeof ListAccountsQueryDto>;

export const AccountCurrencyDto = CurrencyDto;

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

export const AccountPaginationDto = PaginationDto;

export const AccountListResponseDto = t.NoValidate(
  t.Object({
    accounts: t.Array(AccountDto),
    pagination: PaginationDto,
    summary: t.Array(AccountSummaryDto),
  }),
);

export const AccountDeleteResponseDto = DeleteResponseDto;

export type AccountResponse = typeof AccountDto.static;
export type AccountSummary = typeof AccountSummaryDto.static;
export type AccountListResponse = typeof AccountListResponseDto.static;
export type AccountDeleteResponse = typeof AccountDeleteResponseDto.static;
