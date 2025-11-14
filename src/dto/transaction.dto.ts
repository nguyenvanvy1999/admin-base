import { t } from 'elysia';
import { z } from 'zod';
import {
  CategoryType,
  EntityType,
  TransactionType,
} from '../generated/prisma/enums';
import {
  createArrayPreprocess,
  createListQueryDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

const BaseTransactionDto = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1),
  amount: z.number().min(0.01),
  currencyId: z.string().optional(),
  fee: z.number().min(0).optional(),
  feeInBaseCurrency: z.number().min(0).optional(),
  date: z.iso.datetime(),
  dueDate: z.iso.datetime().optional(),
  note: z.string().optional(),
  receiptUrl: z.string().optional(),
  metadata: z.unknown().optional(),
  eventId: z.string().optional(),
});

export const IncomeTransactionDto = BaseTransactionDto.extend({
  type: z.literal(TransactionType.income),
  categoryId: z.string().min(1),
});

export const ExpenseTransactionDto = BaseTransactionDto.extend({
  type: z.literal(TransactionType.expense),
  categoryId: z.string().min(1),
});

export const TransferTransactionDto = BaseTransactionDto.extend({
  type: z.literal(TransactionType.transfer),
  toAccountId: z.string().min(1),
  toAmount: z.number().min(0.01).optional(),
});

export const LoanGivenTransactionDto = BaseTransactionDto.extend({
  type: z.literal(TransactionType.loan_given),
  entityId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const LoanReceivedTransactionDto = BaseTransactionDto.extend({
  type: z.literal(TransactionType.loan_received),
  entityId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const RepayDebtTransactionDto = BaseTransactionDto.extend({
  type: z.literal(TransactionType.repay_debt),
  entityId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const CollectDebtTransactionDto = BaseTransactionDto.extend({
  type: z.literal(TransactionType.collect_debt),
  entityId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const UpsertTransactionDto = z.discriminatedUnion('type', [
  IncomeTransactionDto,
  ExpenseTransactionDto,
  TransferTransactionDto,
  LoanGivenTransactionDto,
  LoanReceivedTransactionDto,
  RepayDebtTransactionDto,
  CollectDebtTransactionDto,
]);

export const IncomeExpenseTransactionDto = z.union([
  IncomeTransactionDto,
  ExpenseTransactionDto,
]);

export const BatchTransactionsDto = z.object({
  transactions: z.array(UpsertTransactionDto).min(1),
});

export const BalanceAdjustmentDto = z.object({
  accountId: z.string().min(1),
  newBalance: z.number().min(0),
  date: z.iso.datetime(),
  note: z.string().optional(),
});

export const BalanceAdjustmentElysiaDto = t.Object({
  accountId: t.String({ minLength: 1 }),
  newBalance: t.Number({ minimum: 0 }),
  date: t.String({ format: 'date-time' }),
  note: t.Optional(t.String()),
});

export type IBalanceAdjustmentDto = z.infer<typeof BalanceAdjustmentDto>;

export const ListTransactionsQueryDto = createListQueryDto({
  types: createArrayPreprocess(z.enum(TransactionType)),
  accountIds: createArrayPreprocess(z.string()),
  categoryIds: createArrayPreprocess(z.string()),
  entityIds: createArrayPreprocess(z.string()),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  sortBy: z.enum(['date', 'amount', 'type', 'accountId']).optional(),
});

export type IUpsertTransaction = z.infer<typeof UpsertTransactionDto>;
export type IListTransactionsQuery = z.infer<typeof ListTransactionsQueryDto>;
export type IIncomeExpenseTransaction = z.infer<
  typeof IncomeExpenseTransactionDto
>;
export type ITransferTransaction = z.infer<typeof TransferTransactionDto>;
export type ILoanTransaction = z.infer<
  | typeof LoanGivenTransactionDto
  | typeof LoanReceivedTransactionDto
  | typeof RepayDebtTransactionDto
  | typeof CollectDebtTransactionDto
>;
export type IBatchTransactionsDto = z.infer<typeof BatchTransactionsDto>;

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

export const TransactionEventDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    startAt: t.String(),
    endAt: t.Nullable(t.String()),
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
    categoryId: t.String(),
    entityId: t.Nullable(t.String()),
    investmentId: t.Nullable(t.String()),
    eventId: t.Nullable(t.String()),
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
    event: t.Nullable(TransactionEventDto),
    currency: t.Nullable(TransactionCurrencyDto),
  }),
);

export const TransactionPaginationDto = PaginationDto;

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
    pagination: PaginationDto,
    summary: t.Array(TransactionSummaryDto),
  }),
);

export const TransactionDeleteResponseDto = DeleteResponseDto;

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
