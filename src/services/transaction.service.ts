import type { IDb } from '@server/configs/db';
import { type PrismaTx, prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated/prisma/client';
import { TransactionType } from '@server/generated/prisma/enums';
import type {
  TransactionOrderByWithRelationInput,
  TransactionWhereInput,
} from '@server/generated/prisma/models/Transaction';
import { CATEGORY_NAME } from '@server/share/constants/category';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import {
  dateToIsoString,
  dateToNullableIsoString,
  decimalToNullableString,
  decimalToString,
} from '@server/share/utils/formatters';
import Decimal from 'decimal.js';
import type {
  BatchTransactionsResponse,
  IBalanceAdjustmentDto,
  IBatchTransactionsDto,
  IIncomeExpenseTransaction,
  IListTransactionsQuery,
  ILoanTransaction,
  ITransferTransaction,
  IUpsertTransaction,
  TransactionDetail,
  TransactionListResponse,
} from '../dto/transaction.dto';
import {
  type AccountBalanceService,
  accountBalanceService,
} from './account-balance.service';
import { CategoryService } from './category.service';
import {
  type CurrencyConversionService,
  currencyConversionService,
} from './currency-conversion.service';
import {
  CURRENCY_SELECT_BASIC,
  TRANSACTION_SELECT_FOR_BALANCE,
  TRANSACTION_SELECT_FULL,
  TRANSACTION_SELECT_MINIMAL,
} from './selects';

type TransactionRecord = Prisma.TransactionGetPayload<{
  select: typeof TRANSACTION_SELECT_FULL;
}>;
type MinimalCurrency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
};

const formatCurrencyRecord = (currency: MinimalCurrency | null | undefined) => {
  if (!currency) {
    return null;
  }
  return {
    ...currency,
    symbol: currency.symbol ?? null,
  };
};

const formatAccountRecord = (
  account: NonNullable<TransactionRecord['account']>,
) => ({
  ...account,
  currency: formatCurrencyRecord(account.currency)!,
});

const formatOptionalAccountRecord = (
  account: TransactionRecord['toAccount'],
) => {
  if (!account) {
    return null;
  }
  return {
    ...account,
    currency: formatCurrencyRecord(account.currency)!,
  };
};

const formatCategoryRecord = (category: TransactionRecord['category']) => {
  if (!category) {
    return null;
  }
  return {
    ...category,
    icon: category.icon ?? null,
    color: category.color ?? null,
  };
};

const formatEntityRecord = (entity: TransactionRecord['entity']) => {
  if (!entity) {
    return null;
  }
  return { ...entity };
};

const formatEventRecord = (
  event: TransactionRecord['event'],
): TransactionDetail['event'] => {
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    name: event.name,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt ? event.endAt.toISOString() : null,
  };
};

const formatTransactionRecord = (
  transaction: TransactionRecord,
): TransactionDetail => ({
  ...transaction,
  toAccountId: transaction.toAccountId ?? null,
  transferGroupId: transaction.transferGroupId ?? null,
  categoryId: transaction.categoryId,
  entityId: transaction.entityId ?? null,
  investmentId: transaction.investmentId ?? null,
  eventId: transaction.eventId ?? null,
  amount: decimalToString(transaction.amount),
  price: decimalToNullableString(transaction.price),
  priceInBaseCurrency: decimalToNullableString(transaction.priceInBaseCurrency),
  quantity: decimalToNullableString(transaction.quantity),
  fee: decimalToString(transaction.fee),
  feeInBaseCurrency: decimalToNullableString(transaction.feeInBaseCurrency),
  date: dateToIsoString(transaction.date),
  dueDate: dateToNullableIsoString(transaction.dueDate),
  note: transaction.note ?? null,
  receiptUrl: transaction.receiptUrl ?? null,
  metadata: transaction.metadata ?? null,
  createdAt: dateToIsoString(transaction.createdAt),
  updatedAt: dateToIsoString(transaction.updatedAt),
  account: formatAccountRecord(transaction.account!),
  toAccount: formatOptionalAccountRecord(transaction.toAccount),
  category: formatCategoryRecord(transaction.category),
  entity: formatEntityRecord(transaction.entity),
  event: formatEventRecord(transaction.event),
  currency: formatCurrencyRecord(transaction.currency),
});

class TransactionHandlerFactory {
  constructor(
    private readonly deps: {
      db: IDb;
      balanceService: AccountBalanceService;
      currencyConverter: CurrencyConversionService;
    },
  ) {}

  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
      select: TRANSACTION_SELECT_MINIMAL,
    });
    if (!account) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
    }
    return account;
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.deps.db.category.findFirst({
      where: {
        id: categoryId,
        userId,
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });
    if (!category) {
      throwAppError(ErrorCode.NOT_FOUND, 'Category not found');
    }
  }

  private async validateEntityOwnership(userId: string, entityId: string) {
    const entity = await this.deps.db.entity.findFirst({
      where: {
        id: entityId,
        userId,
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });
    if (!entity) {
      throwAppError(ErrorCode.ENTITY_NOT_FOUND, 'Entity not found');
    }
  }

  private async validateEventOwnership(
    userId: string,
    eventId: string | undefined,
  ) {
    if (!eventId) {
      return;
    }
    const event = await this.deps.db.event.findFirst({
      where: {
        id: eventId,
        userId,
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });
    if (!event) {
      throwAppError(ErrorCode.NOT_FOUND, 'Event not found');
    }
  }

  private async prepareTransactionData(
    userId: string,
    data: IUpsertTransaction,
    accountCurrencyId: string,
    userBaseCurrencyId: string,
  ) {
    if (!userBaseCurrencyId) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'User base currency is required',
      );
    }

    const currencyId = data.currencyId ?? accountCurrencyId;
    const amountDecimal = new Decimal(data.amount);
    const feeDecimal = new Decimal(data.fee ?? 0);

    if (data.eventId) {
      await this.validateEventOwnership(userId, data.eventId);
    }

    let feeInBaseCurrency: Decimal | null = data.feeInBaseCurrency
      ? new Decimal(data.feeInBaseCurrency)
      : null;

    if (
      currencyId !== userBaseCurrencyId &&
      feeDecimal.gt(0) &&
      !feeInBaseCurrency
    ) {
      feeInBaseCurrency =
        await this.deps.currencyConverter.convertToBaseCurrency(
          feeDecimal,
          currencyId,
          userBaseCurrencyId,
        );
    }

    const baseData = {
      userId,
      accountId: data.accountId,
      type: data.type,
      amount: amountDecimal.toNumber(),
      currencyId,
      fee: feeDecimal.toNumber(),
      feeInBaseCurrency: feeInBaseCurrency?.toNumber() ?? null,
      date: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      note: data.note ?? null,
      receiptUrl: data.receiptUrl ?? null,
      metadata: (data.metadata ?? null) as any,
      eventId: data.eventId ?? null,
    };

    switch (data.type) {
      case TransactionType.income:
      case TransactionType.expense: {
        const incomeExpenseData = data as IIncomeExpenseTransaction;
        return {
          ...baseData,
          categoryId: incomeExpenseData.categoryId,
          toAccountId: null,
          entityId: null,
          price: null,
          priceInBaseCurrency: null,
          quantity: null,
        };
      }

      case TransactionType.transfer: {
        const transferData = data as ITransferTransaction;
        const categoryService = new CategoryService();
        const transferCategoryId = categoryService.getCategoryId(
          userId,
          CATEGORY_NAME.TRANSFER,
        );
        return {
          ...baseData,
          toAccountId: transferData.toAccountId,
          categoryId: transferCategoryId,
          entityId: null,
          price: null,
          priceInBaseCurrency: null,
          quantity: null,
        };
      }

      case TransactionType.loan_given:
      case TransactionType.loan_received:
      case TransactionType.repay_debt:
      case TransactionType.collect_debt: {
        const loanData = data as ILoanTransaction;
        return {
          ...baseData,
          entityId: loanData.entityId,
          categoryId: loanData.categoryId,
          toAccountId: null,
          price: null,
          priceInBaseCurrency: null,
          quantity: null,
        };
      }

      default: {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid transaction type: ${(data as IUpsertTransaction).type}`,
        );
      }
    }
  }

  private createTransaction(
    transactionData: Parameters<typeof prisma.transaction.create>[0]['data'],
    type: TransactionType,
    accountId: string,
    toAccountId: string | null,
    amount: Decimal,
    fee: Decimal,
    currencyId: string,
    accountCurrencyId: string,
    toAccountCurrencyId?: string,
  ) {
    return this.deps.db.$transaction(async (tx: PrismaTx) => {
      await this.deps.balanceService.applyTransactionBalance(
        tx,
        type,
        accountId,
        toAccountId,
        amount,
        fee,
        currencyId,
        accountCurrencyId,
        toAccountCurrencyId,
      );

      return tx.transaction.create({
        data: transactionData,
        select: TRANSACTION_SELECT_FULL,
      });
    });
  }

  private async updateTransaction(
    userId: string,
    transactionId: string,
    transactionData: Parameters<typeof prisma.transaction.update>[0]['data'],
    type: TransactionType,
    accountId: string,
    toAccountId: string | null,
    amount: Decimal,
    fee: Decimal,
    currencyId: string,
    accountCurrencyId: string,
    toAccountCurrencyId?: string,
  ) {
    const existingTransaction = await this.deps.db.transaction.findUnique({
      where: { id: transactionId },
      select: TRANSACTION_SELECT_FOR_BALANCE,
    });

    if (!existingTransaction) {
      throwAppError(ErrorCode.NOT_FOUND, 'Transaction not found');
    }
    if (existingTransaction.userId !== userId) {
      throwAppError(ErrorCode.FORBIDDEN, 'Transaction not owned by user');
    }

    return this.deps.db.$transaction(async (tx: PrismaTx) => {
      await this.deps.balanceService.revertTransactionBalance(
        tx,
        existingTransaction.type,
        existingTransaction.accountId,
        existingTransaction.toAccountId,
        existingTransaction.amount,
        existingTransaction.fee,
        existingTransaction.currencyId,
        existingTransaction.account.currencyId,
        existingTransaction.toAccount?.currencyId,
      );

      await this.deps.balanceService.applyTransactionBalance(
        tx,
        type,
        accountId,
        toAccountId,
        amount,
        fee,
        currencyId,
        accountCurrencyId,
        toAccountCurrencyId,
      );

      return tx.transaction.update({
        where: { id: transactionId },
        data: transactionData,
        select: TRANSACTION_SELECT_FULL,
      });
    });
  }

  private async createPairedTransfer(
    userId: string,
    data: ITransferTransaction,
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
  ) {
    const toAccount = await this.validateAccountOwnership(
      userId,
      data.toAccountId,
    );

    const currencyId = data.currencyId ?? fromAccount.currencyId;
    const amountDecimal = new Decimal(data.amount);
    const feeDecimal = new Decimal(data.fee ?? 0);
    const toAmountDecimal = data.toAmount
      ? new Decimal(data.toAmount)
      : undefined;
    const groupId = crypto.randomUUID();
    const categoryService = new CategoryService();
    const transferCategoryId = categoryService.getCategoryId(
      userId,
      CATEGORY_NAME.TRANSFER,
    );

    return this.deps.db.$transaction(async (tx: PrismaTx) => {
      await this.deps.balanceService.applyTransactionBalance(
        tx,
        TransactionType.transfer,
        fromAccount.id,
        toAccount.id,
        amountDecimal,
        feeDecimal,
        currencyId,
        fromAccount.currencyId,
        toAccount.currencyId,
        toAmountDecimal,
      );

      // Create primary transaction (from -> to)
      const primary = await tx.transaction.create({
        data: {
          userId,
          accountId: fromAccount.id,
          toAccountId: toAccount.id,
          type: TransactionType.transfer,
          categoryId: transferCategoryId,
          amount: amountDecimal.toNumber(),
          currencyId,
          fee: feeDecimal.toNumber(),
          feeInBaseCurrency: null,
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          note: data.note ?? null,
          receiptUrl: data.receiptUrl ?? null,
          metadata: (data.metadata ?? null) as any,
          transferGroupId: groupId,
          isTransferMirror: false,
        },
        select: TRANSACTION_SELECT_FULL,
      });

      const amountInToCurrency = toAmountDecimal
        ? toAmountDecimal
        : await this.deps.currencyConverter.convertToToAccountCurrency(
            amountDecimal,
            currencyId,
            toAccount.currencyId,
          );

      // Create mirror transaction (to -> from)
      await tx.transaction.create({
        data: {
          userId,
          accountId: toAccount.id,
          toAccountId: fromAccount.id,
          type: TransactionType.transfer,
          categoryId: transferCategoryId,
          amount: amountInToCurrency.toNumber(),
          currencyId: toAccount.currencyId,
          fee: 0,
          feeInBaseCurrency: null,
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          note: data.note ?? null,
          receiptUrl: data.receiptUrl ?? null,
          metadata: (data.metadata ?? null) as any,
          transferGroupId: groupId,
          isTransferMirror: true,
        },
      });

      return primary;
    });
  }

  private async updatePairedTransfer(
    userId: string,
    data: ITransferTransaction & { id: string },
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
  ) {
    // Load existing primary
    const existing = await this.deps.db.transaction.findUnique({
      where: { id: data.id },
      select: TRANSACTION_SELECT_FOR_BALANCE,
    });
    if (!existing || existing.userId !== userId) {
      throwAppError(ErrorCode.NOT_FOUND, 'Transaction not found');
    }
    if (existing.type !== TransactionType.transfer) {
      throwAppError(
        ErrorCode.INVALID_TRANSACTION_TYPE,
        'Invalid transaction type for transfer update',
      );
    }

    const toAccount = await this.validateAccountOwnership(
      userId,
      data.toAccountId,
    );

    const currencyId = data.currencyId ?? fromAccount.currencyId;
    const amountDecimal = new Decimal(data.amount);
    const feeDecimal = new Decimal(data.fee ?? 0);
    const toAmountDecimal = data.toAmount
      ? new Decimal(data.toAmount)
      : undefined;

    const groupId = existing.transferGroupId ?? crypto.randomUUID();
    const categoryService = new CategoryService();
    const transferCategoryId = categoryService.getCategoryId(
      userId,
      CATEGORY_NAME.TRANSFER,
    );

    // Get existing mirror to get original toAmount for revert
    const existingMirrorForRevert = existing.transferGroupId
      ? await this.deps.db.transaction.findFirst({
          where: {
            userId,
            transferGroupId: existing.transferGroupId,
            isTransferMirror: true,
            deletedAt: null,
          },
          select: { amount: true },
        })
      : null;

    return this.deps.db.$transaction(async (tx: PrismaTx) => {
      // Revert balances from old primary only
      // Use existing mirror amount if available for accurate revert
      const existingToAmount = existingMirrorForRevert
        ? new Decimal(existingMirrorForRevert.amount)
        : undefined;

      await this.deps.balanceService.revertTransactionBalance(
        tx,
        existing.type,
        existing.accountId,
        existing.toAccountId,
        existing.amount,
        existing.fee,
        existing.currencyId,
        existing.account.currencyId,
        existing.toAccount?.currencyId,
        existingToAmount,
      );

      await this.deps.balanceService.applyTransactionBalance(
        tx,
        TransactionType.transfer,
        fromAccount.id,
        toAccount.id,
        amountDecimal,
        feeDecimal,
        currencyId,
        fromAccount.currencyId,
        toAccount.currencyId,
        toAmountDecimal,
      );

      // Update primary
      const updatedPrimary = await tx.transaction.update({
        where: { id: data.id },
        data: {
          userId,
          accountId: fromAccount.id,
          toAccountId: toAccount.id,
          type: TransactionType.transfer,
          categoryId: transferCategoryId,
          amount: amountDecimal.toNumber(),
          currencyId,
          fee: feeDecimal.toNumber(),
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          note: data.note ?? null,
          receiptUrl: data.receiptUrl ?? null,
          metadata: (data.metadata ?? null) as any,
          transferGroupId: groupId,
          isTransferMirror: false,
        },
        select: TRANSACTION_SELECT_FULL,
      });

      const amountInToCurrency = toAmountDecimal
        ? toAmountDecimal
        : await this.deps.currencyConverter.convertToToAccountCurrency(
            amountDecimal,
            currencyId,
            toAccount.currencyId,
          );

      // Upsert mirror using groupId
      const existingMirror = existing.transferGroupId
        ? await tx.transaction.findFirst({
            where: {
              userId,
              transferGroupId: existing.transferGroupId,
              isTransferMirror: true,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null;

      if (existingMirror) {
        await tx.transaction.update({
          where: { id: existingMirror.id },
          data: {
            accountId: toAccount.id,
            toAccountId: fromAccount.id,
            categoryId: transferCategoryId,
            amount: amountInToCurrency.toNumber(),
            currencyId: toAccount.currencyId,
            fee: 0,
            date: new Date(data.date),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            note: data.note ?? null,
            receiptUrl: data.receiptUrl ?? null,
            metadata: (data.metadata ?? null) as any,
            transferGroupId: groupId,
            isTransferMirror: true,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            userId,
            accountId: toAccount.id,
            toAccountId: fromAccount.id,
            type: TransactionType.transfer,
            categoryId: transferCategoryId,
            amount: amountInToCurrency.toNumber(),
            currencyId: toAccount.currencyId,
            fee: 0,
            date: new Date(data.date),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            note: data.note ?? null,
            receiptUrl: data.receiptUrl ?? null,
            metadata: (data.metadata ?? null) as any,
            transferGroupId: groupId,
            isTransferMirror: true,
          },
        });
      }

      return updatedPrimary;
    });
  }

  private async handleTransaction(
    userId: string,
    data: IUpsertTransaction,
    account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    userBaseCurrencyId: string,
    validateOwnership: () => Promise<void>,
    getToAccount: () => Promise<Awaited<
      ReturnType<typeof this.validateAccountOwnership>
    > | null>,
  ) {
    await validateOwnership();

    const toAccount = await getToAccount();

    const currencyId = data.currencyId ?? account.currencyId;
    const amountDecimal = new Decimal(data.amount);
    const feeDecimal = new Decimal(data.fee ?? 0);

    const preparedTransactionData = await this.prepareTransactionData(
      userId,
      data,
      account.currencyId,
      userBaseCurrencyId,
    );

    if (data.id) {
      return this.updateTransaction(
        userId,
        data.id,
        preparedTransactionData,
        data.type,
        account.id,
        toAccount?.id ?? null,
        amountDecimal,
        feeDecimal,
        currencyId,
        account.currencyId,
        toAccount?.currencyId,
      );
    }

    return this.createTransaction(
      preparedTransactionData,
      data.type,
      account.id,
      toAccount?.id ?? null,
      amountDecimal,
      feeDecimal,
      currencyId,
      account.currencyId,
      toAccount?.currencyId,
    );
  }

  handleIncomeExpense(
    userId: string,
    data: IIncomeExpenseTransaction,
    account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    userBaseCurrencyId: string,
  ) {
    return this.handleTransaction(
      userId,
      data,
      account,
      userBaseCurrencyId,
      () => this.validateCategoryOwnership(userId, data.categoryId),
      () => Promise.resolve(null),
    );
  }

  handleTransfer(
    userId: string,
    data: ITransferTransaction,
    account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
  ) {
    if (data.id) {
      return this.updatePairedTransfer(
        userId,
        data as ITransferTransaction & { id: string },
        account,
      );
    }
    return this.createPairedTransfer(userId, data, account);
  }

  handleLoan(
    userId: string,
    data: ILoanTransaction,
    account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    userBaseCurrencyId: string,
  ) {
    return this.handleTransaction(
      userId,
      data,
      account,
      userBaseCurrencyId,
      () => this.validateEntityOwnership(userId, data.entityId),
      () => Promise.resolve(null),
    );
  }
}

export class TransactionService {
  private handlerFactory: TransactionHandlerFactory;

  constructor(
    private readonly deps: {
      db: IDb;
      categoryService: CategoryService;
      accountBalanceService: AccountBalanceService;
      currencyConversionService: CurrencyConversionService;
    } = {
      db: prisma,
      categoryService: new CategoryService(),
      accountBalanceService: accountBalanceService,
      currencyConversionService: currencyConversionService,
    },
  ) {
    this.handlerFactory = new TransactionHandlerFactory({
      db: this.deps.db,
      balanceService: this.deps.accountBalanceService,
      currencyConverter: this.deps.currencyConversionService,
    });
  }

  async upsertTransaction(
    userId: string,
    data: IUpsertTransaction,
  ): Promise<TransactionDetail> {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: data.accountId,
        userId,
        deletedAt: null,
      },
      select: TRANSACTION_SELECT_MINIMAL,
    });

    if (!account) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
    }

    const user = await this.deps.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, baseCurrencyId: true },
    });

    const transactionType = data.type;
    let transaction: TransactionRecord;
    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.expense:
        transaction = await this.handlerFactory.handleIncomeExpense(
          userId,
          data as IIncomeExpenseTransaction,
          account,
          user.baseCurrencyId,
        );
        break;

      case TransactionType.transfer:
        transaction = await this.handlerFactory.handleTransfer(
          userId,
          data as ITransferTransaction,
          account,
        );
        break;

      case TransactionType.loan_given:
      case TransactionType.loan_received:
      case TransactionType.repay_debt:
      case TransactionType.collect_debt:
        transaction = await this.handlerFactory.handleLoan(
          userId,
          data as ILoanTransaction,
          account,
          user.baseCurrencyId,
        );
        break;

      default: {
        throwAppError(
          ErrorCode.INVALID_TRANSACTION_TYPE,
          `Invalid transaction type: ${transactionType}`,
        );
      }
    }

    return formatTransactionRecord(transaction);
  }

  async getTransaction(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetail> {
    const transaction = await this.deps.db.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        deletedAt: null,
      },
      select: TRANSACTION_SELECT_FULL,
    });

    if (!transaction) {
      throwAppError(ErrorCode.NOT_FOUND, 'Transaction not found');
    }

    return formatTransactionRecord(transaction);
  }

  async listTransactions(
    userId: string,
    filters: IListTransactionsQuery = {},
  ): Promise<TransactionListResponse> {
    const {
      types,
      accountIds,
      categoryIds,
      entityIds,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc',
    } = filters;

    const where: TransactionWhereInput = {
      userId,
      deletedAt: null,
    };

    if (types && types.length > 0) {
      where.type = { in: types };
    }
    if (accountIds && accountIds.length > 0) {
      where.accountId = { in: accountIds };
    }
    if (categoryIds && categoryIds.length > 0) {
      where.categoryId = { in: categoryIds };
    }
    if (entityIds && entityIds.length > 0) {
      where.entityId = { in: entityIds };
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    const orderBy: TransactionOrderByWithRelationInput = {};
    if (sortBy === 'date') {
      orderBy.date = sortOrder;
    } else if (sortBy === 'amount') {
      orderBy.amount = sortOrder;
    } else if (sortBy === 'type') {
      orderBy.type = sortOrder;
    } else if (sortBy === 'accountId') {
      orderBy.accountId = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [transactions, total, summaryGroups] = await Promise.all([
      this.deps.db.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: TRANSACTION_SELECT_FULL,
      }),
      this.deps.db.transaction.count({ where }),
      this.deps.db.transaction.groupBy({
        by: ['currencyId', 'type'],
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const currencyIds = [...new Set(summaryGroups.map((g) => g.currencyId))];

    const currencies = await this.deps.db.currency.findMany({
      where: {
        id: { in: currencyIds },
      },
      select: CURRENCY_SELECT_BASIC,
    });

    const currencyMap = new Map(currencies.map((c) => [c.id, c]));

    const summaryByCurrency = new Map<
      string,
      { currency: MinimalCurrency; totalIncome: Decimal; totalExpense: Decimal }
    >();

    for (const group of summaryGroups) {
      const currencyId = group.currencyId;
      const currency = currencyMap.get(currencyId);

      if (!currency) continue;

      if (!summaryByCurrency.has(currencyId)) {
        summaryByCurrency.set(currencyId, {
          currency,
          totalIncome: new Decimal(0),
          totalExpense: new Decimal(0),
        });
      }

      const summary = summaryByCurrency.get(currencyId)!;
      const sumAmount = group._sum.amount
        ? new Decimal(group._sum.amount)
        : new Decimal(0);

      if (group.type === TransactionType.income) {
        summary.totalIncome = summary.totalIncome.plus(sumAmount);
      } else if (group.type === TransactionType.expense) {
        summary.totalExpense = summary.totalExpense.plus(sumAmount);
      }
    }

    const summary = Array.from(summaryByCurrency.values()).map((item) => ({
      currency: formatCurrencyRecord(item.currency)!,
      totalIncome: item.totalIncome.toNumber(),
      totalExpense: item.totalExpense.toNumber(),
    }));

    return {
      transactions: transactions.map(formatTransactionRecord),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await this.deps.db.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        userId: true,
        type: true,
        transferGroupId: true,
        isTransferMirror: true,
        accountId: true,
        toAccountId: true,
        amount: true,
        fee: true,
        currencyId: true,
        account: { select: { currencyId: true } },
        toAccount: { select: { currencyId: true } },
      },
    });

    if (!transaction) {
      throwAppError(ErrorCode.NOT_FOUND, 'Transaction not found');
    }
    if (transaction.userId !== userId) {
      throwAppError(ErrorCode.FORBIDDEN, 'Transaction not owned by user');
    }

    // For transfers, delete both sides, but revert balance once using the primary
    if (transaction.type === TransactionType.transfer) {
      // Determine primary row
      const isPrimary = !transaction.isTransferMirror;
      const primary = isPrimary
        ? transaction
        : await this.deps.db.transaction.findFirst({
            where: {
              userId,
              transferGroupId: transaction.transferGroupId ?? undefined,
              isTransferMirror: false,
              deletedAt: null,
            },
            select: {
              id: true,
              type: true,
              accountId: true,
              toAccountId: true,
              amount: true,
              fee: true,
              currencyId: true,
              transferGroupId: true,
              account: { select: { currencyId: true } },
              toAccount: { select: { currencyId: true } },
            },
          });

      // Get mirror transaction amount for accurate revert
      const mirrorForRevert = primary?.transferGroupId
        ? await this.deps.db.transaction.findFirst({
            where: {
              userId,
              transferGroupId: primary.transferGroupId,
              isTransferMirror: true,
              deletedAt: null,
            },
            select: { amount: true },
          })
        : null;

      await this.deps.db.$transaction(async (tx: PrismaTx) => {
        if (primary) {
          const existingToAmount = mirrorForRevert
            ? new Decimal(mirrorForRevert.amount)
            : undefined;
          await accountBalanceService.revertTransactionBalance(
            tx,
            primary.type,
            primary.accountId,
            primary.toAccountId,
            primary.amount,
            primary.fee,
            primary.currencyId,
            primary.account.currencyId,
            primary.toAccount?.currencyId,
            existingToAmount,
          );
        }

        // Soft delete both sides if group present, else only this one
        if (transaction.transferGroupId) {
          await tx.transaction.updateMany({
            where: {
              userId,
              transferGroupId: transaction.transferGroupId,
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });
        } else {
          await tx.transaction.update({
            where: { id: transactionId },
            data: { deletedAt: new Date() },
          });
        }
      });
    } else {
      await this.deps.db.$transaction(async (tx: PrismaTx) => {
        await accountBalanceService.revertTransactionBalance(
          tx,
          transaction.type,
          transaction.accountId,
          transaction.toAccountId,
          transaction.amount,
          transaction.fee,
          transaction.currencyId,
          transaction.account.currencyId,
          transaction.toAccount?.currencyId,
        );

        await tx.transaction.update({
          where: { id: transactionId },
          data: { deletedAt: new Date() },
        });
      });
    }

    return { success: true, message: 'Transaction deleted successfully' };
  }

  async createBatchTransactions(
    userId: string,
    data: IBatchTransactionsDto,
  ): Promise<BatchTransactionsResponse> {
    const user = await this.deps.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, baseCurrencyId: true },
    });

    const results: Array<{
      success: boolean;
      data?: TransactionDetail;
      error?: string;
    }> = [];

    await this.deps.db.$transaction(async (tx: PrismaTx) => {
      for (const transactionData of data.transactions) {
        try {
          const account = await tx.account.findFirst({
            where: {
              id: transactionData.accountId,
              userId,
              deletedAt: null,
            },
            select: TRANSACTION_SELECT_MINIMAL,
          });

          if (!account) {
            results.push({
              success: false,
              error: 'Account not found',
            });
            continue;
          }

          let result: TransactionRecord | undefined;
          switch (transactionData.type) {
            case TransactionType.income:
            case TransactionType.expense: {
              const incomeExpenseData =
                transactionData as IIncomeExpenseTransaction;
              const category = await tx.category.findFirst({
                where: {
                  id: incomeExpenseData.categoryId,
                  userId,
                  deletedAt: null,
                },
              });
              if (!category) {
                results.push({
                  success: false,
                  error: 'Category not found',
                });
                continue;
              }
              result = await this.handlerFactory.handleIncomeExpense(
                userId,
                incomeExpenseData,
                account,
                user.baseCurrencyId,
              );
              break;
            }

            case TransactionType.transfer: {
              const transferData = transactionData as ITransferTransaction;
              const toAccount = await tx.account.findFirst({
                where: {
                  id: transferData.toAccountId,
                  userId,
                  deletedAt: null,
                },
              });
              if (!toAccount) {
                results.push({
                  success: false,
                  error: 'To account not found',
                });
                continue;
              }
              result = await this.handlerFactory.handleTransfer(
                userId,
                transferData,
                account,
              );
              break;
            }

            case TransactionType.loan_given:
            case TransactionType.loan_received: {
              const loanData = transactionData as ILoanTransaction;
              const entity = await tx.entity.findFirst({
                where: {
                  id: loanData.entityId,
                  userId,
                  deletedAt: null,
                },
              });
              if (!entity) {
                results.push({
                  success: false,
                  error: 'Entity not found',
                });
                continue;
              }
              result = await this.handlerFactory.handleLoan(
                userId,
                loanData,
                account,
                user.baseCurrencyId,
              );
              break;
            }

            default: {
              results.push({
                success: false,
                error: `Invalid transaction type: ${(transactionData as IUpsertTransaction).type}`,
              });
              continue;
            }
          }

          if (result) {
            results.push({
              success: true,
              data: formatTransactionRecord(result),
            });
          }
        } catch (error) {
          results.push({
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      }
    });

    return {
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  }

  async adjustAccountBalance(
    userId: string,
    data: IBalanceAdjustmentDto,
  ): Promise<TransactionDetail> {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: data.accountId,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        balance: true,
        currencyId: true,
      },
    });

    if (!account) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
    }

    const currentBalance = new Decimal(account.balance);
    const newBalance = new Decimal(data.newBalance);
    const difference = newBalance.minus(currentBalance);

    if (difference.isZero()) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'New balance must be different from current balance',
      );
    }

    const transactionType = difference.isPositive()
      ? TransactionType.income
      : TransactionType.expense;
    const categoryType = difference.isPositive() ? 'income' : 'expense';
    const categoryId =
      await this.deps.categoryService.getOrCreateBalanceAdjustmentCategory(
        userId,
        categoryType,
      );

    const user = await this.deps.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, baseCurrencyId: true },
    });

    if (!user.baseCurrencyId) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'User base currency is required. Please set your base currency in profile settings.',
      );
    }

    const amount = difference.abs();

    const currencyId = account.currencyId;

    const transactionData: IIncomeExpenseTransaction = {
      accountId: account.id,
      amount: amount.toNumber(),
      currencyId,
      fee: 0,
      date: data.date,
      note: data.note ?? undefined,
      categoryId,
      type: transactionType,
      metadata: {
        oldBalance: currentBalance.toNumber(),
        newBalance: newBalance.toNumber(),
      },
    };

    const accountRecord = {
      id: account.id,
      userId: userId,
      currencyId,
    };

    const transaction = await this.handlerFactory.handleIncomeExpense(
      userId,
      transactionData,
      accountRecord as Awaited<
        ReturnType<(typeof this.handlerFactory)['validateAccountOwnership']>
      >,
      user.baseCurrencyId,
    );

    return formatTransactionRecord(transaction);
  }
}

export const transactionService = new TransactionService();
