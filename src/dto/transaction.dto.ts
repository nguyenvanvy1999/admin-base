import { t } from 'elysia';
import { Currency, TransactionType } from '../generated/prisma/enums';

export const UpsertTransactionDto = t.Object({
  id: t.Optional(t.String()),
  accountId: t.String(),
  toAccountId: t.Optional(t.String()),
  type: t.Enum(TransactionType),
  categoryId: t.Optional(t.String()),
  investmentId: t.Optional(t.String()),
  loanPartyId: t.Optional(t.String()),
  amount: t.Number({ minimum: 1 }),
  currency: t.Optional(t.Enum(Currency)),
  price: t.Optional(t.Number()),
  priceInBaseCurrency: t.Optional(t.Number()),
  quantity: t.Optional(t.Number()),
  fee: t.Optional(t.Number({ minimum: 0 })),
  feeInBaseCurrency: t.Optional(t.Number()),
  date: t.String({ format: 'date-time' }),
  dueDate: t.Optional(t.String({ format: 'date-time' })),
  note: t.Optional(t.String()),
  receiptUrl: t.Optional(t.String()),
  metadata: t.Optional(t.Any()),
});

export const ListTransactionsQueryDto = t.Object({
  type: t.Optional(t.Enum(TransactionType)),
  accountId: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  investmentId: t.Optional(t.String()),
  loanPartyId: t.Optional(t.String()),
  dateFrom: t.Optional(t.String({ format: 'date-time' })),
  dateTo: t.Optional(t.String({ format: 'date-time' })),
  page: t.Optional(t.Integer({ minimum: 1, examples: [1], default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, examples: [20], default: 20 })),
  sortBy: t.Optional(t.Union([t.Literal('date'), t.Literal('amount')])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertTransaction = typeof UpsertTransactionDto.static;
export type IListTransactionsQuery = typeof ListTransactionsQueryDto.static;
