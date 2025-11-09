import { TransactionType } from '@server/generated/prisma/enums';
import type {
  TransactionOrderByWithRelationInput,
  TransactionWhereInput,
} from '@server/generated/prisma/models/Transaction';
import { prisma } from '@server/libs/db';
import Decimal from 'decimal.js';
import { Elysia } from 'elysia';
import type {
  IBatchTransactionsDto,
  IIncomeExpenseTransaction,
  IListTransactionsQuery,
  ILoanTransaction,
  ITransferTransaction,
  IUpsertTransaction,
} from '../dto/transaction.dto';
import { CURRENCY_SELECT_BASIC } from './selects';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const TRANSACTION_INCLUDE = {
  account: { include: { currency: true } },
  toAccount: { include: { currency: true } },
  category: true,
  entity: true,
  currency: true,
} as const;

const TRANSACTION_SELECT_FOR_BALANCE = {
  id: true,
  userId: true,
  type: true,
  accountId: true,
  toAccountId: true,
  amount: true,
  fee: true,
  currencyId: true,
  account: { select: { currencyId: true } },
  toAccount: { select: { currencyId: true } },
} as const;

const TRANSACTION_SELECT_FOR_LIST = {
  id: true,
  userId: true,
  accountId: true,
  toAccountId: true,
  type: true,
  categoryId: true,
  entityId: true,
  investmentId: true,
  amount: true,
  currencyId: true,
  price: true,
  priceInBaseCurrency: true,
  quantity: true,
  fee: true,
  feeInBaseCurrency: true,
  date: true,
  dueDate: true,
  note: true,
  receiptUrl: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  account: {
    select: {
      id: true,
      name: true,
      currency: {
        select: {
          id: true,
          code: true,
          name: true,
          symbol: true,
        },
      },
    },
  },
  toAccount: {
    select: {
      id: true,
      name: true,
      currency: {
        select: {
          id: true,
          code: true,
          name: true,
          symbol: true,
        },
      },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true,
    },
  },
  entity: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  currency: {
    select: {
      id: true,
      code: true,
      name: true,
      symbol: true,
    },
  },
} as const;

const ACCOUNT_SELECT_MINIMAL = {
  id: true,
  userId: true,
  currencyId: true,
} as const;

class BalanceCalculator {
  private exchangeRates: Record<string, Record<string, Decimal>> = {
    VND: { USD: new Decimal(1).div(25000) },
    USD: { VND: new Decimal(25000) },
  };

  async convertCurrency(
    amount: Decimal | number,
    fromCurrencyId: string,
    toCurrencyId: string,
  ): Promise<Decimal> {
    if (fromCurrencyId === toCurrencyId) {
      return new Decimal(amount);
    }

    const fromCurrency = await prisma.currency.findUnique({
      where: { id: fromCurrencyId },
      select: CURRENCY_SELECT_BASIC,
    });
    const toCurrency = await prisma.currency.findUnique({
      where: { id: toCurrencyId },
      select: CURRENCY_SELECT_BASIC,
    });

    if (!fromCurrency || !toCurrency) {
      throw new Error('Currency not found');
    }

    const rate = this.exchangeRates[fromCurrency.code]?.[toCurrency.code];
    if (!rate) {
      throw new Error(
        `Currency conversion not supported: ${fromCurrency.code} to ${toCurrency.code}`,
      );
    }

    return new Decimal(amount).mul(rate);
  }

  async convertAmountToAccountCurrency(
    amount: Decimal | number,
    fee: Decimal | number,
    currencyId: string,
    accountCurrencyId: string,
  ): Promise<{
    amountInAccountCurrency: Decimal;
    feeInAccountCurrency: Decimal;
  }> {
    const amountDecimal = new Decimal(amount);
    const feeDecimal = new Decimal(fee);

    let amountInAccountCurrency = amountDecimal;
    if (currencyId !== accountCurrencyId) {
      amountInAccountCurrency = await this.convertCurrency(
        amountDecimal,
        currencyId,
        accountCurrencyId,
      );
    }

    let feeInAccountCurrency = feeDecimal;
    if (currencyId !== accountCurrencyId) {
      feeInAccountCurrency = await this.convertCurrency(
        feeDecimal,
        currencyId,
        accountCurrencyId,
      );
    }

    return { amountInAccountCurrency, feeInAccountCurrency };
  }

  async convertAmountToToAccountCurrency(
    amount: Decimal | number,
    currencyId: string,
    toAccountCurrencyId?: string,
  ): Promise<Decimal> {
    if (!toAccountCurrencyId || currencyId === toAccountCurrencyId) {
      return new Decimal(amount);
    }
    return await this.convertCurrency(amount, currencyId, toAccountCurrencyId);
  }
}

class BalanceUpdater {
  constructor(private calculator: BalanceCalculator) {}

  private async updateTransferBalance(
    tx: PrismaTx,
    accountId: string,
    toAccountId: string,
    amountInAccountCurrency: Decimal,
    feeInAccountCurrency: Decimal,
    amountInToAccountCurrency: Decimal,
    isRevert: boolean,
  ) {
    const fromAccountOperation = isRevert ? 'increment' : 'decrement';
    const toAccountOperation = isRevert ? 'decrement' : 'increment';

    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: {
          [fromAccountOperation]: amountInAccountCurrency
            .plus(feeInAccountCurrency)
            .toNumber(),
        },
      },
    });

    await tx.account.update({
      where: { id: toAccountId },
      data: {
        balance: {
          [toAccountOperation]: amountInToAccountCurrency.toNumber(),
        },
      },
    });
  }

  async applyBalanceEffect(
    tx: PrismaTx,
    transactionType: TransactionType,
    accountId: string,
    toAccountId: string | null | undefined,
    amount: Decimal | number,
    fee: Decimal | number,
    currencyId: string,
    accountCurrencyId: string,
    toAccountCurrencyId?: string,
  ) {
    await tx.account.findUniqueOrThrow({
      where: { id: accountId },
      select: {
        id: true,
      },
    });

    const { amountInAccountCurrency, feeInAccountCurrency } =
      await this.calculator.convertAmountToAccountCurrency(
        amount,
        fee,
        currencyId,
        accountCurrencyId,
      );

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: { increment: amountInAccountCurrency.toNumber() },
          },
        });
        break;

      case TransactionType.expense:
      case TransactionType.loan_given:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              decrement: amountInAccountCurrency
                .plus(feeInAccountCurrency)
                .toNumber(),
            },
          },
        });
        break;

      case TransactionType.transfer: {
        if (!toAccountId) {
          throw new Error('To account is required for transfer');
        }
        await tx.account.findUniqueOrThrow({
          where: { id: toAccountId },
        });

        const amountInToAccountCurrency =
          await this.calculator.convertAmountToToAccountCurrency(
            amount,
            currencyId,
            toAccountCurrencyId,
          );

        await this.updateTransferBalance(
          tx,
          accountId,
          toAccountId,
          amountInAccountCurrency,
          feeInAccountCurrency,
          amountInToAccountCurrency,
          false,
        );
        break;
      }
    }
  }

  async revertBalanceEffect(
    tx: PrismaTx,
    transactionType: TransactionType,
    accountId: string,
    toAccountId: string | null | undefined,
    amount: Decimal | number,
    fee: Decimal | number,
    currencyId: string,
    accountCurrencyId: string,
    toAccountCurrencyId?: string,
  ) {
    const { amountInAccountCurrency, feeInAccountCurrency } =
      await this.calculator.convertAmountToAccountCurrency(
        amount,
        fee,
        currencyId,
        accountCurrencyId,
      );

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: { decrement: amountInAccountCurrency.toNumber() },
          },
        });
        break;

      case TransactionType.expense:
      case TransactionType.loan_given:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: amountInAccountCurrency
                .plus(feeInAccountCurrency)
                .toNumber(),
            },
          },
        });
        break;

      case TransactionType.transfer: {
        if (!toAccountId) {
          throw new Error('To account is required for transfer');
        }

        const amountInToAccountCurrency =
          await this.calculator.convertAmountToToAccountCurrency(
            amount,
            currencyId,
            toAccountCurrencyId,
          );

        await this.updateTransferBalance(
          tx,
          accountId,
          toAccountId,
          amountInAccountCurrency,
          feeInAccountCurrency,
          amountInToAccountCurrency,
          true,
        );
        break;
      }
    }
  }
}

class TransactionHandlerFactory {
  constructor(
    private calculator: BalanceCalculator,
    private balanceUpdater: BalanceUpdater,
  ) {}

  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });
    if (!category) {
      throw new Error('Category not found');
    }
  }

  private async validateEntityOwnership(userId: string, entityId: string) {
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        userId,
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });
    if (!entity) {
      throw new Error('Entity not found');
    }
  }

  private async prepareTransactionData(
    userId: string,
    data: IUpsertTransaction,
    accountCurrencyId: string,
    userBaseCurrencyId: string,
  ) {
    const currencyId = data.currencyId ?? accountCurrencyId;
    const amountDecimal = new Decimal(data.amount);
    const feeDecimal = new Decimal(data.fee ?? 0);

    let feeInBaseCurrency: Decimal | null = data.feeInBaseCurrency
      ? new Decimal(data.feeInBaseCurrency)
      : null;

    if (
      currencyId !== userBaseCurrencyId &&
      feeDecimal.gt(0) &&
      !feeInBaseCurrency
    ) {
      feeInBaseCurrency = await this.calculator.convertCurrency(
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
      metadata: data.metadata ?? null,
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
        return {
          ...baseData,
          toAccountId: transferData.toAccountId,
          categoryId: null,
          entityId: null,
          price: null,
          priceInBaseCurrency: null,
          quantity: null,
        };
      }

      case TransactionType.loan_given:
      case TransactionType.loan_received: {
        const loanData = data as ILoanTransaction;
        return {
          ...baseData,
          entityId: loanData.entityId,
          categoryId: null,
          toAccountId: null,
          price: null,
          priceInBaseCurrency: null,
          quantity: null,
        };
      }

      default: {
        const _exhaustive: never = data;
        throw new Error(
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
    return prisma.$transaction(async (tx: PrismaTx) => {
      await this.balanceUpdater.applyBalanceEffect(
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
        include: TRANSACTION_INCLUDE,
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
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: TRANSACTION_SELECT_FOR_BALANCE,
    });

    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }
    if (existingTransaction.userId !== userId) {
      throw new Error('Transaction not owned by user');
    }

    return prisma.$transaction(async (tx: PrismaTx) => {
      await this.balanceUpdater.revertBalanceEffect(
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

      await this.balanceUpdater.applyBalanceEffect(
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
        include: TRANSACTION_INCLUDE,
      });
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
    userBaseCurrencyId: string,
  ) {
    return this.handleTransaction(
      userId,
      data,
      account,
      userBaseCurrencyId,
      () => Promise.resolve(),
      () => this.validateAccountOwnership(userId, data.toAccountId),
    );
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
  private calculator: BalanceCalculator;
  private balanceUpdater: BalanceUpdater;
  private handlerFactory: TransactionHandlerFactory;

  constructor() {
    this.calculator = new BalanceCalculator();
    this.balanceUpdater = new BalanceUpdater(this.calculator);
    this.handlerFactory = new TransactionHandlerFactory(
      this.calculator,
      this.balanceUpdater,
    );
  }

  async upsertTransaction(userId: string, data: IUpsertTransaction) {
    const account = await prisma.account.findFirst({
      where: {
        id: data.accountId,
        userId,
        deletedAt: null,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, baseCurrencyId: true },
    });

    const transactionType = data.type;
    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.expense:
        return this.handlerFactory.handleIncomeExpense(
          userId,
          data as IIncomeExpenseTransaction,
          account,
          user.baseCurrencyId,
        );

      case TransactionType.transfer:
        return this.handlerFactory.handleTransfer(
          userId,
          data as ITransferTransaction,
          account,
          user.baseCurrencyId,
        );

      case TransactionType.loan_given:
      case TransactionType.loan_received:
        return this.handlerFactory.handleLoan(
          userId,
          data as ILoanTransaction,
          account,
          user.baseCurrencyId,
        );

      default: {
        const _exhaustive: never = data;
        throw new Error(`Invalid transaction type: ${transactionType}`);
      }
    }
  }

  async getTransaction(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        deletedAt: null,
      },
      include: TRANSACTION_INCLUDE,
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  async listTransactions(userId: string, filters: IListTransactionsQuery = {}) {
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
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: TRANSACTION_SELECT_FOR_LIST,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ['currencyId', 'type'],
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const currencyIds = [...new Set(summaryGroups.map((g) => g.currencyId))];

    const currencies = await prisma.currency.findMany({
      where: {
        id: { in: currencyIds },
      },
      select: CURRENCY_SELECT_BASIC,
    });

    const currencyMap = new Map(currencies.map((c) => [c.id, c]));

    const summaryByCurrency = new Map<
      string,
      { currency: any; totalIncome: Decimal; totalExpense: Decimal }
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
      currency: item.currency,
      totalIncome: item.totalIncome.toNumber(),
      totalExpense: item.totalExpense.toNumber(),
    }));

    return {
      transactions,
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
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        userId: true,
        type: true,
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
      throw new Error('Transaction not found');
    }
    if (transaction.userId !== userId) {
      throw new Error('Transaction not owned by user');
    }

    await prisma.$transaction(async (tx: PrismaTx) => {
      await this.balanceUpdater.revertBalanceEffect(
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

    return { success: true, message: 'Transaction deleted successfully' };
  }

  async createBatchTransactions(userId: string, data: IBatchTransactionsDto) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, baseCurrencyId: true },
    });

    const results: Array<{
      success: boolean;
      data?: unknown;
      error?: string;
    }> = [];

    await prisma.$transaction(async (tx: PrismaTx) => {
      for (const transactionData of data.transactions) {
        try {
          const account = await tx.account.findFirst({
            where: {
              id: transactionData.accountId,
              userId,
              deletedAt: null,
            },
            select: ACCOUNT_SELECT_MINIMAL,
          });

          if (!account) {
            results.push({
              success: false,
              error: 'Account not found',
            });
            continue;
          }

          let result;
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
                user.baseCurrencyId,
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
              const _exhaustive: never = transactionData;
              results.push({
                success: false,
                error: `Invalid transaction type: ${(transactionData as IUpsertTransaction).type}`,
              });
              continue;
            }
          }

          results.push({ success: true, data: result });
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
}

export default new Elysia().decorate(
  'transactionService',
  new TransactionService(),
);
