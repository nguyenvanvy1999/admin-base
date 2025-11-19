import type { IDb } from '@server/configs/db';
import { type PrismaTx, prisma } from '@server/configs/db';
import type {
  TransactionOrderByWithRelationInput,
  TransactionUncheckedCreateInput,
  TransactionWhereInput,
} from '@server/generated';
import { TransactionType } from '@server/generated';
import {
  CATEGORY_NAME,
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
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
  type MinimalCurrency,
  mapCurrencyRecord,
  mapTransaction,
  type TransactionRecord,
} from './mappers';
import {
  CURRENCY_SELECT_BASIC,
  TRANSACTION_SELECT_FOR_BALANCE,
  TRANSACTION_SELECT_FULL,
  TRANSACTION_SELECT_MINIMAL,
} from './selects';

class TransactionHandlerFactory {
  constructor(
    private readonly deps: {
      db: IDb;
      balanceService: AccountBalanceService;
      currencyConverter: CurrencyConversionService;
      idUtil: IdUtil;
    },
  ) {}

  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: accountId,
        userId,
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
    transactionData: Omit<TransactionUncheckedCreateInput, 'id'>,
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
        data: {
          ...transactionData,
          id: this.deps.idUtil.dbId(DB_PREFIX.TRANSACTION),
        },
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
          id: this.deps.idUtil.dbId(DB_PREFIX.TRANSACTION),
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
          id: this.deps.idUtil.dbId(DB_PREFIX.TRANSACTION),
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
            id: this.deps.idUtil.dbId(DB_PREFIX.TRANSACTION),
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
        { ...data, id: data.id },
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
  private readonly handlerFactory: TransactionHandlerFactory;

  constructor(
    private readonly deps: {
      db: IDb;
      categoryService: CategoryService;
      accountBalanceService: AccountBalanceService;
      currencyConversionService: CurrencyConversionService;
      idUtil: IdUtil;
    } = {
      db: prisma,
      categoryService: new CategoryService(),
      accountBalanceService: accountBalanceService,
      currencyConversionService: currencyConversionService,
      idUtil,
    },
  ) {
    this.handlerFactory = new TransactionHandlerFactory({
      db: this.deps.db,
      balanceService: this.deps.accountBalanceService,
      currencyConverter: this.deps.currencyConversionService,
      idUtil: this.deps.idUtil,
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

    return mapTransaction(transaction);
  }

  async getTransaction(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetail> {
    const transaction = await this.deps.db.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      select: TRANSACTION_SELECT_FULL,
    });

    if (!transaction) {
      throwAppError(ErrorCode.NOT_FOUND, 'Transaction not found');
    }

    return mapTransaction(transaction);
  }

  async listTransactions(
    userId: string,
    filters: IListTransactionsQuery,
  ): Promise<TransactionListResponse> {
    const {
      types,
      accountIds,
      categoryIds,
      entityIds,
      dateFrom,
      dateTo,
      page,
      limit,
      sortBy,
      sortOrder,
    } = filters;

    const where: TransactionWhereInput = {
      userId,
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
      currency: mapCurrencyRecord(item.currency)!,
      totalIncome: item.totalIncome.toNumber(),
      totalExpense: item.totalExpense.toNumber(),
    }));

    return {
      transactions: transactions.map(mapTransaction),
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

        // Hard delete both sides if group present, else only this one
        if (transaction.transferGroupId) {
          await tx.transaction.deleteMany({
            where: {
              userId,
              transferGroupId: transaction.transferGroupId,
            },
          });
        } else {
          await tx.transaction.delete({
            where: { id: transactionId },
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

        await tx.transaction.delete({
          where: { id: transactionId },
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
                error: `Invalid transaction type: ${transactionData.type}`,
              });
              continue;
            }
          }

          if (result) {
            results.push({
              success: true,
              data: mapTransaction(result),
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
      accountRecord,
      user.baseCurrencyId,
    );

    return mapTransaction(transaction);
  }

  async getUnpaidDebts(
    userId: string,
    query?: {
      from?: string;
      to?: string;
    },
  ): Promise<Array<TransactionDetail & { remainingAmount: number }>> {
    const dateFrom = query?.from ? new Date(query.from) : undefined;
    const dateTo = query?.to ? new Date(query.to) : undefined;

    const whereClause: TransactionWhereInput = {
      userId,
      type: {
        in: [
          TransactionType.loan_given,
          TransactionType.loan_received,
          TransactionType.repay_debt,
          TransactionType.collect_debt,
        ],
      },
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const allLoanTransactions = await this.deps.db.transaction.findMany({
      where: whereClause,
      select: TRANSACTION_SELECT_FULL,
      orderBy: {
        date: 'desc',
      },
    });

    const entityDebtMap = new Map<
      string,
      {
        loans: Array<{
          id: string;
          type: TransactionType;
          amount: Decimal;
          date: Date;
          transaction: TransactionRecord;
        }>;
        totalRepaid: Decimal;
        totalCollected: Decimal;
      }
    >();

    for (const tx of allLoanTransactions) {
      if (!tx.entityId) continue;

      const amount = new Decimal(tx.amount);
      const entityKey = tx.entityId;

      if (!entityDebtMap.has(entityKey)) {
        entityDebtMap.set(entityKey, {
          loans: [],
          totalRepaid: new Decimal(0),
          totalCollected: new Decimal(0),
        });
      }

      const entityDebt = entityDebtMap.get(entityKey)!;

      if (
        tx.type === TransactionType.loan_given ||
        tx.type === TransactionType.loan_received
      ) {
        entityDebt.loans.push({
          id: tx.id,
          type: tx.type,
          amount,
          date: tx.date,
          transaction: tx as TransactionRecord,
        });
      } else if (tx.type === TransactionType.repay_debt) {
        entityDebt.totalRepaid = entityDebt.totalRepaid.plus(amount);
      } else if (tx.type === TransactionType.collect_debt) {
        entityDebt.totalCollected = entityDebt.totalCollected.plus(amount);
      }
    }

    const debtTransactions: Array<
      TransactionDetail & { remainingAmount: number }
    > = [];

    for (const [_, entityDebt] of entityDebtMap.entries()) {
      let totalLoanGiven = new Decimal(0);
      let totalLoanReceived = new Decimal(0);

      for (const loan of entityDebt.loans) {
        if (loan.type === TransactionType.loan_given) {
          totalLoanGiven = totalLoanGiven.plus(loan.amount);
        } else {
          totalLoanReceived = totalLoanReceived.plus(loan.amount);
        }
      }

      const netLoanGiven = totalLoanGiven.minus(entityDebt.totalCollected);
      const netLoanReceived = totalLoanReceived.minus(entityDebt.totalRepaid);

      for (const loan of entityDebt.loans) {
        let remainingAmount: number;
        if (loan.type === TransactionType.loan_given) {
          const ratio = totalLoanGiven.gt(0)
            ? loan.amount.div(totalLoanGiven)
            : new Decimal(0);
          const calculated = netLoanGiven.times(ratio);
          remainingAmount = calculated.gt(0) ? calculated.toNumber() : 0;
        } else {
          const ratio = totalLoanReceived.gt(0)
            ? loan.amount.div(totalLoanReceived)
            : new Decimal(0);
          const calculated = netLoanReceived.times(ratio);
          remainingAmount = calculated.gt(0) ? calculated.toNumber() : 0;
        }

        if (remainingAmount > 0) {
          const formatted = mapTransaction(loan.transaction);
          debtTransactions.push({
            ...formatted,
            remainingAmount,
          });
        }
      }
    }

    return debtTransactions;
  }
}

export const transactionService = new TransactionService();
