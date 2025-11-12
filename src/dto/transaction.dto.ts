import { t } from 'elysia';
import {
  CategoryType,
  EntityType,
  TransactionType,
} from '../generated/prisma/enums';

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
    toAmount: t.Optional(t.Number({ minimum: 0.01 })),
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
  sortBy: t.Optional(
    t.Union([
      t.Literal('date'),
      t.Literal('amount'),
      t.Literal('type'),
      t.Literal('accountId'),
    ]),
  ),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertTransaction = typeof UpsertTransactionDto.static;
export type IListTransactionsQuery = typeof ListTransactionsQueryDto.static;
export type IIncomeExpenseTransaction =
  typeof IncomeExpenseTransactionDto.static;
export type ITransferTransaction = typeof TransferTransactionDto.static;
export type ILoanTransaction = typeof LoanTransactionDto.static;
export type IBatchTransactionsDto = typeof BatchTransactionsDto.static;

const transactionCurrencyShape = {
  id: t.String(),
  code: t.String(),
  name: t.String(),
  symbol: t.Nullable(t.String()),
} as const;

export const TransactionCurrencyDto = t.NoValidate(
  t.Object(transactionCurrencyShape),
);

export const TransactionAccountDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    currency: TransactionCurrencyDto,
  }),
);

export const TransactionCategoryDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    type: t.Enum(CategoryType),
    icon: t.Nullable(t.String()),
    color: t.Nullable(t.String()),
  }),
);

export const TransactionEntityDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    type: t.Enum(EntityType),
  }),
);

export const TransactionDetailDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    accountId: t.String(),
    toAccountId: t.Nullable(t.String()),
    transferGroupId: t.Nullable(t.String()),
    isTransferMirror: t.Boolean(),
    type: t.Enum(TransactionType),
    categoryId: t.Nullable(t.String()),
    entityId: t.Nullable(t.String()),
    investmentId: t.Nullable(t.String()),
    amount: t.String(),
    currencyId: t.String(),
    price: t.Nullable(t.String()),
    priceInBaseCurrency: t.Nullable(t.String()),
    quantity: t.Nullable(t.String()),
    fee: t.String(),
    feeInBaseCurrency: t.Nullable(t.String()),
    date: t.String(),
    dueDate: t.Nullable(t.String()),
    note: t.Nullable(t.String()),
    receiptUrl: t.Nullable(t.String()),
    metadata: t.Nullable(t.Any()),
    createdAt: t.String(),
    updatedAt: t.String(),
    account: TransactionAccountDto,
    toAccount: t.Nullable(TransactionAccountDto),
    category: t.Nullable(TransactionCategoryDto),
    entity: t.Nullable(TransactionEntityDto),
    currency: t.Nullable(TransactionCurrencyDto),
  }),
);

export const TransactionPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const TransactionSummaryDto = t.NoValidate(
  t.Object({
    currency: TransactionCurrencyDto,
    totalIncome: t.Number(),
    totalExpense: t.Number(),
  }),
);

export const TransactionListResponseDto = t.NoValidate(
  t.Object({
    transactions: t.Array(TransactionDetailDto),
    pagination: TransactionPaginationDto,
    summary: t.Array(TransactionSummaryDto),
  }),
);

export const TransactionDeleteResponseDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
);

export const BatchTransactionResultDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    data: t.Optional(TransactionDetailDto),
    error: t.Optional(t.String()),
  }),
);

export const BatchTransactionsResponseDto = t.NoValidate(
  t.Object({
    results: t.Array(BatchTransactionResultDto),
    summary: t.Object({
      total: t.Integer(),
      successful: t.Integer(),
      failed: t.Integer(),
    }),
  }),
);

export type TransactionDetail = typeof TransactionDetailDto.static;
export type TransactionListResponse = typeof TransactionListResponseDto.static;
export type TransactionDeleteResponse =
  typeof TransactionDeleteResponseDto.static;
export type BatchTransactionsResponse =
  typeof BatchTransactionsResponseDto.static;
