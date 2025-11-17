import type { IDb } from '@server/configs/db';
import { type PrismaTx, prisma } from '@server/configs/db';
import type {
  Prisma,
  TransactionOrderByWithRelationInput,
  TransactionUncheckedCreateInput,
  TransactionWhereInput,
} from '@server/generated';
import { TransactionType } from '@server/generated';
import {
  CATEGORY_NAME,
  DB_PREFIX,
  dateToIsoString,
  dateToNullableIsoString,
  decimalToNullableString,
  decimalToString,
  ERROR_MESSAGES,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import type { TransactionMetadata } from '@server/share/types/metadata';
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
import {
  type OwnershipValidatorService,
  ownershipValidatorService,
} from './base/ownership-validator.service';
import { CategoryService } from './category.service';
import {
  type CurrencyConversionService,
  currencyConversionService,
} from './currency-conversion.service';
import {
  type DebtCalculationService,
  debtCalculationService,
} from './debt-calculation.service';
import type { ITransactionService } from './interfaces/ITransactionService';
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
  created: dateToIsoString(transaction.created),
  modified: dateToIsoString(transaction.modified),
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
      idUtil: IdUtil;
      ownershipValidator: OwnershipValidatorService;
      categoryService: CategoryService;
    },
  ) {}

  private async validateAccountOwnership(userId: string, accountId: string) {
    return this.deps.ownershipValidator.validateAccountOwnership(
      userId,
      accountId,
      TRANSACTION_SELECT_MINIMAL,
    );
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    await this.deps.ownershipValidator.validateCategoryOwnership(
      userId,
      categoryId,
    );
  }

  private async validateEntityOwnership(userId: string, entityId: string) {
    await this.deps.ownershipValidator.validateEntityOwnership(
      userId,
      entityId,
    );
  }

  private async validateEventOwnership(
    userId: string,
    eventId: string | undefined,
  ) {
    if (!eventId) {
      return;
    }
    await this.deps.ownershipValidator.validateEventOwnership(userId, eventId);
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
        ERROR_MESSAGES.USER_BASE_CURRENCY_REQUIRED,
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
      metadata: (data.metadata ?? null) as TransactionMetadata,
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
        const transferCategoryId = this.deps.categoryService.getCategoryId(
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
          `${ERROR_MESSAGES.INVALID_TRANSACTION_TYPE}: ${(data as IUpsertTransaction).type}`,
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
      throwAppError(ErrorCode.NOT_FOUND, ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }
    if (existingTransaction.userId !== userId) {
      throwAppError(ErrorCode.FORBIDDEN, ERROR_MESSAGES.TRANSACTION_NOT_OWNED);
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

    const transferData = this.prepareTransferData(data, fromAccount, toAccount);
    const groupId = crypto.randomUUID();
    const transferCategoryId = this.deps.categoryService.getCategoryId(
      userId,
      CATEGORY_NAME.TRANSFER,
    );

    return this.deps.db.$transaction(async (tx: PrismaTx) => {
      await this.applyTransferBalance(tx, transferData, fromAccount, toAccount);

      const primary = await this.createPrimaryTransfer(
        tx,
        userId,
        transferData,
        fromAccount,
        toAccount,
        transferCategoryId,
        groupId,
      );

      const amountInToCurrency = await this.calculateAmountInToCurrency(
        transferData,
        toAccount,
      );

      await this.createMirrorTransfer(
        tx,
        userId,
        transferData,
        fromAccount,
        toAccount,
        transferCategoryId,
        groupId,
        amountInToCurrency,
      );

      return primary;
    });
  }

  private prepareTransferData(
    data: ITransferTransaction,
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    toAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
  ) {
    const currencyId = data.currencyId ?? fromAccount.currencyId;
    const amountDecimal = new Decimal(data.amount);
    const feeDecimal = new Decimal(data.fee ?? 0);
    const toAmountDecimal = data.toAmount
      ? new Decimal(data.toAmount)
      : undefined;

    return {
      currencyId,
      amountDecimal,
      feeDecimal,
      toAmountDecimal,
      date: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      note: data.note ?? null,
      receiptUrl: data.receiptUrl ?? null,
      metadata: (data.metadata ?? null) as TransactionMetadata,
    };
  }

  private async applyTransferBalance(
    tx: PrismaTx,
    transferData: ReturnType<typeof this.prepareTransferData>,
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    toAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
  ) {
    await this.deps.balanceService.applyTransactionBalance(
      tx,
      TransactionType.transfer,
      fromAccount.id,
      toAccount.id,
      transferData.amountDecimal,
      transferData.feeDecimal,
      transferData.currencyId,
      fromAccount.currencyId,
      toAccount.currencyId,
      transferData.toAmountDecimal,
    );
  }

  private async createPrimaryTransfer(
    tx: PrismaTx,
    userId: string,
    transferData: ReturnType<typeof this.prepareTransferData>,
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    toAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    transferCategoryId: string,
    groupId: string,
  ) {
    return tx.transaction.create({
      data: {
        id: this.deps.idUtil.dbId(DB_PREFIX.TRANSACTION),
        userId,
        accountId: fromAccount.id,
        toAccountId: toAccount.id,
        type: TransactionType.transfer,
        categoryId: transferCategoryId,
        amount: transferData.amountDecimal.toNumber(),
        currencyId: transferData.currencyId,
        fee: transferData.feeDecimal.toNumber(),
        feeInBaseCurrency: null,
        date: transferData.date,
        dueDate: transferData.dueDate,
        note: transferData.note,
        receiptUrl: transferData.receiptUrl,
        metadata: transferData.metadata,
        transferGroupId: groupId,
        isTransferMirror: false,
      },
      select: TRANSACTION_SELECT_FULL,
    });
  }

  private async calculateAmountInToCurrency(
    transferData: ReturnType<typeof this.prepareTransferData>,
    toAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
  ) {
    if (transferData.toAmountDecimal) {
      return transferData.toAmountDecimal;
    }
    return this.deps.currencyConverter.convertToToAccountCurrency(
      transferData.amountDecimal,
      transferData.currencyId,
      toAccount.currencyId,
    );
  }

  private async createMirrorTransfer(
    tx: PrismaTx,
    userId: string,
    transferData: ReturnType<typeof this.prepareTransferData>,
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    toAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    transferCategoryId: string,
    groupId: string,
    amountInToCurrency: Decimal,
  ) {
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
        date: transferData.date,
        dueDate: transferData.dueDate,
        note: transferData.note,
        receiptUrl: transferData.receiptUrl,
        metadata: transferData.metadata,
        transferGroupId: groupId,
        isTransferMirror: true,
      },
    });
  }

  private async updatePairedTransfer(
    userId: string,
    data: ITransferTransaction & { id: string },
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
  ) {
    const existing = await this.loadExistingTransferForUpdate(userId, data.id);

    const toAccount = await this.validateAccountOwnership(
      userId,
      data.toAccountId,
    );

    const transferData = this.prepareTransferData(data, fromAccount, toAccount);
    const groupId = existing.transferGroupId ?? crypto.randomUUID();
    const transferCategoryId = this.deps.categoryService.getCategoryId(
      userId,
      CATEGORY_NAME.TRANSFER,
    );

    const existingMirrorForRevert = await this.getExistingMirrorForRevert(
      existing.transferGroupId,
    );

    return this.deps.db.$transaction(async (tx: PrismaTx) => {
      await this.revertExistingTransferBalance(
        tx,
        existing,
        existingMirrorForRevert,
      );

      await this.applyTransferBalance(tx, transferData, fromAccount, toAccount);

      const updatedPrimary = await this.updatePrimaryTransfer(
        tx,
        data.id,
        userId,
        transferData,
        fromAccount,
        toAccount,
        transferCategoryId,
        groupId,
      );

      const amountInToCurrency = await this.calculateAmountInToCurrency(
        transferData,
        toAccount,
      );

      await this.upsertMirrorTransfer(
        tx,
        userId,
        existing.transferGroupId,
        transferData,
        fromAccount,
        toAccount,
        transferCategoryId,
        groupId,
        amountInToCurrency,
      );

      return updatedPrimary;
    });
  }

  private async loadExistingTransferForUpdate(
    userId: string,
    transactionId: string,
  ) {
    const existing = await this.deps.db.transaction.findUnique({
      where: { id: transactionId },
      select: TRANSACTION_SELECT_FOR_BALANCE,
    });
    if (!existing || existing.userId !== userId) {
      throwAppError(ErrorCode.NOT_FOUND, ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }
    if (existing.type !== TransactionType.transfer) {
      throwAppError(
        ErrorCode.INVALID_TRANSACTION_TYPE,
        ERROR_MESSAGES.INVALID_TRANSACTION_TYPE_FOR_TRANSFER,
      );
    }
    return existing;
  }

  private async getExistingMirrorForRevert(
    transferGroupId: string | null,
  ): Promise<{ amount: Decimal } | null> {
    if (!transferGroupId) return null;

    const mirror = await this.deps.db.transaction.findFirst({
      where: {
        transferGroupId,
        isTransferMirror: true,
      },
      select: { amount: true },
    });

    return mirror ? { amount: new Decimal(mirror.amount) } : null;
  }

  private async revertExistingTransferBalance(
    tx: PrismaTx,
    existing: Awaited<ReturnType<typeof this.loadExistingTransferForUpdate>>,
    existingMirrorForRevert: { amount: Decimal } | null,
  ) {
    const existingToAmount = existingMirrorForRevert
      ? existingMirrorForRevert.amount
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
  }

  private async updatePrimaryTransfer(
    tx: PrismaTx,
    transactionId: string,
    userId: string,
    transferData: ReturnType<typeof this.prepareTransferData>,
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    toAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    transferCategoryId: string,
    groupId: string,
  ) {
    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        userId,
        accountId: fromAccount.id,
        toAccountId: toAccount.id,
        type: TransactionType.transfer,
        categoryId: transferCategoryId,
        amount: transferData.amountDecimal.toNumber(),
        currencyId: transferData.currencyId,
        fee: transferData.feeDecimal.toNumber(),
        date: transferData.date,
        dueDate: transferData.dueDate,
        note: transferData.note,
        receiptUrl: transferData.receiptUrl,
        metadata: transferData.metadata,
        transferGroupId: groupId,
        isTransferMirror: false,
      },
      select: TRANSACTION_SELECT_FULL,
    });
  }

  private async upsertMirrorTransfer(
    tx: PrismaTx,
    userId: string,
    existingGroupId: string | null,
    transferData: ReturnType<typeof this.prepareTransferData>,
    fromAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    toAccount: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
    transferCategoryId: string,
    groupId: string,
    amountInToCurrency: Decimal,
  ) {
    const existingMirror = existingGroupId
      ? await tx.transaction.findFirst({
          where: {
            transferGroupId: existingGroupId,
            isTransferMirror: true,
          },
          select: { id: true },
        })
      : null;

    const mirrorData = {
      accountId: toAccount.id,
      toAccountId: fromAccount.id,
      categoryId: transferCategoryId,
      amount: amountInToCurrency.toNumber(),
      currencyId: toAccount.currencyId,
      fee: 0,
      date: transferData.date,
      dueDate: transferData.dueDate,
      note: transferData.note,
      receiptUrl: transferData.receiptUrl,
      metadata: transferData.metadata,
      transferGroupId: groupId,
      isTransferMirror: true,
    };

    if (existingMirror) {
      await tx.transaction.update({
        where: { id: existingMirror.id },
        data: mirrorData,
      });
    } else {
      await tx.transaction.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.TRANSACTION),
          userId,
          ...mirrorData,
        },
      });
    }
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

export class TransactionService implements ITransactionService {
  private readonly handlerFactory: TransactionHandlerFactory;

  constructor(
    private readonly deps: {
      db: IDb;
      categoryService: CategoryService;
      accountBalanceService: AccountBalanceService;
      currencyConversionService: CurrencyConversionService;
      idUtil: IdUtil;
      ownershipValidator: OwnershipValidatorService;
      debtCalculationService: DebtCalculationService;
      cache?: CacheService;
    } = {
      db: prisma,
      categoryService: new CategoryService(),
      accountBalanceService: accountBalanceService,
      currencyConversionService: currencyConversionService,
      idUtil,
      ownershipValidator: ownershipValidatorService,
      debtCalculationService: debtCalculationService,
      cache: cacheService,
    },
  ) {
    this.handlerFactory = new TransactionHandlerFactory({
      db: this.deps.db,
      balanceService: this.deps.accountBalanceService,
      currencyConverter: this.deps.currencyConversionService,
      idUtil: this.deps.idUtil,
      ownershipValidator: this.deps.ownershipValidator,
      categoryService: this.deps.categoryService,
    });
  }

  async upsertTransaction(
    userId: string,
    data: IUpsertTransaction,
  ): Promise<TransactionDetail> {
    const account = await this.validateAccountForTransaction(
      userId,
      data.accountId,
    );

    const user = await this.getUserBaseCurrency(userId);

    const transaction = await this.routeTransactionByType(
      userId,
      data,
      account,
      user.baseCurrencyId,
    );

    return formatTransactionRecord(transaction);
  }

  private async validateAccountForTransaction(
    userId: string,
    accountId: string,
  ) {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: TRANSACTION_SELECT_MINIMAL,
    });

    if (!account) {
      throwAppError(
        ErrorCode.ACCOUNT_NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND,
      );
    }

    return account;
  }

  private async getUserBaseCurrency(userId: string) {
    const cacheKey = `user:${userId}:baseCurrency`;
    const cached = this.deps.cache?.get<{
      id: string;
      baseCurrencyId: string | null;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.deps.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, baseCurrencyId: true },
    });

    if (this.deps.cache) {
      this.deps.cache.set(cacheKey, user, 5 * 60 * 1000);
    }

    return user;
  }

  private async routeTransactionByType(
    userId: string,
    data: IUpsertTransaction,
    account: Awaited<ReturnType<typeof this.validateAccountForTransaction>>,
    baseCurrencyId: string | null,
  ): Promise<TransactionRecord> {
    switch (data.type) {
      case TransactionType.income:
      case TransactionType.expense:
        return this.handlerFactory.handleIncomeExpense(
          userId,
          data as IIncomeExpenseTransaction,
          account,
          baseCurrencyId,
        );

      case TransactionType.transfer:
        return this.handlerFactory.handleTransfer(
          userId,
          data as ITransferTransaction,
          account,
        );

      case TransactionType.loan_given:
      case TransactionType.loan_received:
      case TransactionType.repay_debt:
      case TransactionType.collect_debt:
        return this.handlerFactory.handleLoan(
          userId,
          data as ILoanTransaction,
          account,
          baseCurrencyId,
        );

      default: {
        throwAppError(
          ErrorCode.INVALID_TRANSACTION_TYPE,
          `${ERROR_MESSAGES.INVALID_TRANSACTION_TYPE}: ${data.type}`,
        );
      }
    }
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
      throwAppError(ErrorCode.NOT_FOUND, ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    return formatTransactionRecord(transaction);
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
      throwAppError(ErrorCode.NOT_FOUND, ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }
    if (transaction.userId !== userId) {
      throwAppError(ErrorCode.FORBIDDEN, ERROR_MESSAGES.TRANSACTION_NOT_OWNED);
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

    return { success: true, message: ERROR_MESSAGES.TRANSACTION_DELETED };
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
              error: ERROR_MESSAGES.ACCOUNT_NOT_FOUND,
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
                  error: ERROR_MESSAGES.CATEGORY_NOT_FOUND,
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
                  error: ERROR_MESSAGES.TO_ACCOUNT_NOT_FOUND,
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
                  error: ERROR_MESSAGES.ENTITY_NOT_FOUND,
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
      },
      select: {
        id: true,
        balance: true,
        currencyId: true,
      },
    });

    if (!account) {
      throwAppError(
        ErrorCode.ACCOUNT_NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND,
      );
    }

    const currentBalance = new Decimal(account.balance);
    const newBalance = new Decimal(data.newBalance);
    const difference = newBalance.minus(currentBalance);

    if (difference.isZero()) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        ERROR_MESSAGES.NEW_BALANCE_MUST_DIFFER,
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
        ERROR_MESSAGES.USER_BASE_CURRENCY_REQUIRED_DETAILED,
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

    return formatTransactionRecord(transaction);
  }

  async getUnpaidDebts(
    userId: string,
    query?: {
      from?: string;
      to?: string;
    },
  ): Promise<Array<TransactionDetail & { remainingAmount: number }>> {
    return this.deps.debtCalculationService.getUnpaidDebts(userId, query);
  }
}

export const transactionService = new TransactionService();
