import { t } from 'elysia';
import { TransactionType } from '../generated/prisma/enums';

const BaseTransactionDto = t.Object({
  id: t.Optional(t.String()),
  accountId: t.String(),
  amount: t.Number({ minimum: 0.01 }),
  currencyId: t.Optional(t.String()),
  fee: t.Optional(t.Number({ minimum: 0 })),
  feeInBaseCurrency: t.Optional(t.Number({ minimum: 0 })),
  date: t.String({ format: 'date-time' }),
  dueDate: t.Optional(t.String({ format: 'date-time' })),
  note: t.Optional(t.String()),
  receiptUrl: t.Optional(t.String()),
  metadata: t.Optional(t.Any()),
});

export const IncomeExpenseTransactionDto = t.Composite([
  BaseTransactionDto,
  t.Object({
    type: t.Union([
      t.Literal(TransactionType.income),
      t.Literal(TransactionType.expense),
    ]),
    categoryId: t.String(),
  }),
]);

export const TransferTransactionDto = t.Composite([
  BaseTransactionDto,
  t.Object({
    type: t.Literal(TransactionType.transfer),
    toAccountId: t.String(),
  }),
]);

export const LoanTransactionDto = t.Composite([
  BaseTransactionDto,
  t.Object({
    type: t.Union([
      t.Literal(TransactionType.loan_given),
      t.Literal(TransactionType.loan_received),
    ]),
    entityId: t.String(),
  }),
]);

export const UpsertTransactionDto = t.Union([
  IncomeExpenseTransactionDto,
  TransferTransactionDto,
  LoanTransactionDto,
]);

export const BatchTransactionsDto = t.Object({
  transactions: t.Array(UpsertTransactionDto, { minItems: 1 }),
});

export const ListTransactionsQueryDto = t.Object({
  types: t.Optional(t.Array(t.Enum(TransactionType))),
  accountIds: t.Optional(t.Array(t.String())),
  categoryIds: t.Optional(t.Array(t.String())),
  entityIds: t.Optional(t.Array(t.String())),
  dateFrom: t.Optional(t.String({ format: 'date-time' })),
  dateTo: t.Optional(t.String({ format: 'date-time' })),
  page: t.Optional(t.Integer({ minimum: 1, examples: [1], default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, examples: [20], default: 20 })),
  sortBy: t.Optional(t.Union([t.Literal('date'), t.Literal('amount')])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertTransaction = typeof UpsertTransactionDto.static;
export type IListTransactionsQuery = typeof ListTransactionsQueryDto.static;
export type IIncomeExpenseTransaction =
  typeof IncomeExpenseTransactionDto.static;
export type ITransferTransaction = typeof TransferTransactionDto.static;
export type ILoanTransaction = typeof LoanTransactionDto.static;
export type IBatchTransactionsDto = typeof BatchTransactionsDto.static;
