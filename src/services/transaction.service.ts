import type { PrismaTx } from '@server/common/type';
import { prisma } from '@server/db';
import {
  AccountType,
  type Currency,
  TransactionType,
} from '@server/generated/prisma/enums';
import type {
  TransactionOrderByWithRelationInput,
  TransactionWhereInput,
} from '@server/generated/prisma/models/Transaction';
import Decimal from 'decimal.js';
import { Elysia } from 'elysia';
import type {
  IListTransactionsQuery,
  IUpsertTransaction,
} from '../dto/transaction.dto';

export class TransactionService {
  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        userId: true,
        currency: true,
        type: true,
        balance: true,
        creditLimit: true,
      },
    });
    if (!account) {
      throw new Error('Account not found');
    }
    if (account.userId !== userId) {
      throw new Error('Account not owned by user');
    }
    return account;
  }

  private async validateToAccountOwnership(
    userId: string,
    toAccountId: string,
  ) {
    const account = await prisma.account.findUnique({
      where: { id: toAccountId },
      select: {
        id: true,
        userId: true,
        currency: true,
        type: true,
        balance: true,
        creditLimit: true,
      },
    });
    if (!account) {
      throw new Error('To account not found');
    }
    if (account.userId !== userId) {
      throw new Error('To account not owned by user');
    }
    return account;
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, userId: true },
    });
    if (!category) {
      throw new Error('Category not found');
    }
    if (category.userId !== userId) {
      throw new Error('Category not owned by user');
    }
  }

  private async validateInvestmentOwnership(
    userId: string,
    investmentId: string,
  ) {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      select: { id: true, userId: true },
    });
    if (!investment) {
      throw new Error('Investment not found');
    }
    if (investment.userId !== userId) {
      throw new Error('Investment not owned by user');
    }
  }

  private async validateLoanPartyOwnership(
    userId: string,
    loanPartyId: string,
  ) {
    const loanParty = await prisma.loanParty.findUnique({
      where: { id: loanPartyId },
      select: { id: true, userId: true },
    });
    if (!loanParty) {
      throw new Error('Loan party not found');
    }
    if (loanParty.userId !== userId) {
      throw new Error('Loan party not owned by user');
    }
  }

  private validateSufficientBalance(
    account: {
      balance: Decimal | number;
      type: AccountType;
      creditLimit?: Decimal | number | null;
    },
    amount: Decimal,
    fee: Decimal,
  ) {
    const balance = new Decimal(account.balance);
    const total = amount.plus(fee);

    if (account.type === AccountType.credit_card) {
      const creditLimit = account.creditLimit
        ? new Decimal(account.creditLimit)
        : new Decimal(0);
      const availableCredit = creditLimit.plus(balance);
      if (total.gt(availableCredit)) {
        throw new Error('Insufficient credit limit');
      }
    } else {
      if (total.gt(balance)) {
        throw new Error('Insufficient balance');
      }
    }
  }

  private validateTransactionType(data: {
    type: TransactionType;
    categoryId?: string | null;
    toAccountId?: string | null;
    loanPartyId?: string | null;
    investmentId?: string | null;
  }) {
    switch (data.type) {
      case TransactionType.income:
      case TransactionType.expense:
        if (!data.categoryId) {
          throw new Error(`Category is required for ${data.type} transactions`);
        }
        break;
      case TransactionType.transfer:
        if (!data.toAccountId) {
          throw new Error('To account is required for transfer transactions');
        }
        break;
      case TransactionType.loan_given:
      case TransactionType.loan_received:
        if (!data.loanPartyId) {
          throw new Error(
            `Loan party is required for ${data.type} transactions`,
          );
        }
        break;
      case TransactionType.investment:
        if (!data.investmentId) {
          throw new Error('Investment is required for investment transactions');
        }
        break;
    }
  }

  private convertCurrency(
    amount: Decimal | number,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Decimal {
    const amountDecimal = new Decimal(amount);
    if (fromCurrency === toCurrency) {
      return amountDecimal;
    }

    const exchangeRates: Record<string, Record<string, Decimal>> = {
      VND: { USD: new Decimal(1).div(25000) },
      USD: { VND: new Decimal(25000) },
    };

    const rate = exchangeRates[fromCurrency]?.[toCurrency];
    if (!rate) {
      throw new Error(
        `Currency conversion not supported: ${fromCurrency} to ${toCurrency}`,
      );
    }

    return amountDecimal.mul(rate);
  }

  private async applyBalanceEffect(
    tx: PrismaTx,
    transactionType: TransactionType,
    accountId: string,
    toAccountId: string | null | undefined,
    amount: Decimal | number,
    fee: Decimal | number,
    currency: Currency,
    accountCurrency: Currency,
    toAccountCurrency?: Currency,
  ) {
    const account = await tx.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { id: true, balance: true, type: true, creditLimit: true },
    });

    const amountDecimal = new Decimal(amount);
    const feeDecimal = new Decimal(fee);

    let amountInAccountCurrency = amountDecimal;
    if (currency !== accountCurrency) {
      amountInAccountCurrency = this.convertCurrency(
        amountDecimal,
        currency,
        accountCurrency,
      );
    }

    let feeInAccountCurrency = feeDecimal;
    if (currency !== accountCurrency) {
      feeInAccountCurrency = this.convertCurrency(
        feeDecimal,
        currency,
        accountCurrency,
      );
    }

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amountInAccountCurrency.toNumber() } },
        });
        break;

      case TransactionType.expense:
      case TransactionType.loan_given:
      case TransactionType.investment:
        this.validateSufficientBalance(
          account,
          amountInAccountCurrency,
          feeInAccountCurrency,
        );
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

        this.validateSufficientBalance(
          account,
          amountInAccountCurrency,
          feeInAccountCurrency,
        );

        let amountInToAccountCurrency = amountDecimal;
        if (toAccountCurrency && currency !== toAccountCurrency) {
          amountInToAccountCurrency = this.convertCurrency(
            amountDecimal,
            currency,
            toAccountCurrency,
          );
        }

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
        await tx.account.update({
          where: { id: toAccountId },
          data: {
            balance: { increment: amountInToAccountCurrency.toNumber() },
          },
        });
        break;
      }
    }
  }

  private async revertBalanceEffect(
    tx: PrismaTx,
    transactionType: TransactionType,
    accountId: string,
    toAccountId: string | null | undefined,
    amount: Decimal | number,
    fee: Decimal | number,
    currency: Currency,
    accountCurrency: Currency,
    toAccountCurrency?: Currency,
  ) {
    const amountDecimal = new Decimal(amount);
    const feeDecimal = new Decimal(fee);

    let amountInAccountCurrency = amountDecimal;
    if (currency !== accountCurrency) {
      amountInAccountCurrency = this.convertCurrency(
        amountDecimal,
        currency,
        accountCurrency,
      );
    }

    let feeInAccountCurrency = feeDecimal;
    if (currency !== accountCurrency) {
      feeInAccountCurrency = this.convertCurrency(
        feeDecimal,
        currency,
        accountCurrency,
      );
    }

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amountInAccountCurrency.toNumber() } },
        });
        break;

      case TransactionType.expense:
      case TransactionType.loan_given:
      case TransactionType.investment:
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

        let amountInToAccountCurrency = amountDecimal;
        if (toAccountCurrency && currency !== toAccountCurrency) {
          amountInToAccountCurrency = this.convertCurrency(
            amountDecimal,
            currency,
            toAccountCurrency,
          );
        }

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
        await tx.account.update({
          where: { id: toAccountId },
          data: {
            balance: { decrement: amountInToAccountCurrency.toNumber() },
          },
        });
        break;
      }
    }
  }

  async upsertTransaction(userId: string, data: IUpsertTransaction) {
    this.validateTransactionType(data);

    const account = await this.validateAccountOwnership(userId, data.accountId);
    const currency = data.currency ?? account.currency;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, baseCurrency: true },
    });

    let toAccount: typeof account | null = null;
    if (data.toAccountId) {
      toAccount = await this.validateToAccountOwnership(
        userId,
        data.toAccountId,
      );
    }

    if (data.categoryId) {
      await this.validateCategoryOwnership(userId, data.categoryId);
    }

    if (data.investmentId) {
      await this.validateInvestmentOwnership(userId, data.investmentId);
    }

    if (data.loanPartyId) {
      await this.validateLoanPartyOwnership(userId, data.loanPartyId);
    }

    const amountDecimal = new Decimal(data.amount);
    const feeDecimal = new Decimal(data.fee ?? 0);
    const priceDecimal = data.price ? new Decimal(data.price) : null;
    const quantityDecimal = data.quantity ? new Decimal(data.quantity) : null;

    let priceInBaseCurrency: Decimal | null = data.priceInBaseCurrency
      ? new Decimal(data.priceInBaseCurrency)
      : null;
    let feeInBaseCurrency: Decimal | null = data.feeInBaseCurrency
      ? new Decimal(data.feeInBaseCurrency)
      : null;

    if (currency !== user.baseCurrency) {
      if (priceDecimal && !priceInBaseCurrency) {
        priceInBaseCurrency = this.convertCurrency(
          priceDecimal,
          currency,
          user.baseCurrency,
        );
      }
      if (feeDecimal.gt(0) && !feeInBaseCurrency) {
        feeInBaseCurrency = this.convertCurrency(
          feeDecimal,
          currency,
          user.baseCurrency,
        );
      }
    }

    const transactionData = {
      userId,
      accountId: data.accountId,
      toAccountId: data.toAccountId ?? null,
      type: data.type,
      categoryId: data.categoryId ?? null,
      investmentId: data.investmentId ?? null,
      loanPartyId: data.loanPartyId ?? null,
      amount: amountDecimal.toNumber(),
      currency,
      price: priceDecimal?.toNumber() ?? null,
      priceInBaseCurrency: priceInBaseCurrency?.toNumber() ?? null,
      quantity: quantityDecimal?.toNumber() ?? null,
      fee: feeDecimal.toNumber(),
      feeInBaseCurrency: feeInBaseCurrency?.toNumber() ?? null,
      date: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      note: data.note ?? null,
      receiptUrl: data.receiptUrl ?? null,
      metadata: data.metadata ?? null,
    };

    if (data.id) {
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id: data.id },
        select: {
          id: true,
          userId: true,
          type: true,
          accountId: true,
          toAccountId: true,
          amount: true,
          fee: true,
          currency: true,
          account: { select: { currency: true } },
          toAccount: { select: { currency: true } },
        },
      });

      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }
      if (existingTransaction.userId !== userId) {
        throw new Error('Transaction not owned by user');
      }

      return prisma.$transaction(async (tx: PrismaTx) => {
        await this.revertBalanceEffect(
          tx,
          existingTransaction.type,
          existingTransaction.accountId,
          existingTransaction.toAccountId,
          existingTransaction.amount,
          existingTransaction.fee,
          existingTransaction.currency,
          existingTransaction.account.currency,
          existingTransaction.toAccount?.currency,
        );

        await this.applyBalanceEffect(
          tx,
          data.type,
          data.accountId,
          data.toAccountId,
          amountDecimal,
          feeDecimal,
          currency,
          account.currency,
          toAccount?.currency,
        );

        return tx.transaction.update({
          where: { id: data.id },
          data: transactionData,
          include: {
            account: true,
            toAccount: true,
            category: true,
            investment: true,
            loanParty: true,
          },
        });
      });
    }

    return prisma.$transaction(async (tx: PrismaTx) => {
      await this.applyBalanceEffect(
        tx,
        data.type,
        data.accountId,
        data.toAccountId,
        amountDecimal,
        feeDecimal,
        currency,
        account.currency,
        toAccount?.currency,
      );

      return tx.transaction.create({
        data: transactionData,
        include: {
          account: true,
          toAccount: true,
          category: true,
          investment: true,
          loanParty: true,
        },
      });
    });
  }

  async getTransaction(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        account: true,
        toAccount: true,
        category: true,
        investment: true,
        loanParty: true,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  async listTransactions(userId: string, filters: IListTransactionsQuery = {}) {
    const {
      type,
      accountId,
      categoryId,
      investmentId,
      loanPartyId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc',
    } = filters;

    const where: TransactionWhereInput = {
      userId,
    };

    if (type) {
      where.type = type;
    }
    if (accountId) {
      where.accountId = accountId;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (investmentId) {
      where.investmentId = investmentId;
    }
    if (loanPartyId) {
      where.loanPartyId = loanPartyId;
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
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          account: true,
          toAccount: true,
          category: true,
          investment: true,
          loanParty: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
        currency: true,
        account: { select: { currency: true } },
        toAccount: { select: { currency: true } },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }
    if (transaction.userId !== userId) {
      throw new Error('Transaction not owned by user');
    }

    await prisma.$transaction(async (tx: PrismaTx) => {
      await this.revertBalanceEffect(
        tx,
        transaction.type,
        transaction.accountId,
        transaction.toAccountId,
        transaction.amount,
        transaction.fee,
        transaction.currency,
        transaction.account.currency,
        transaction.toAccount?.currency,
      );

      await tx.transaction.delete({
        where: { id: transactionId },
      });
    });

    return { success: true, message: 'Transaction deleted successfully' };
  }
}

export default new Elysia().decorate(
  'transactionService',
  new TransactionService(),
);
