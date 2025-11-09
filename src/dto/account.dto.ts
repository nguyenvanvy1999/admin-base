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
