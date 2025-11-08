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
      balance: number;
      type: AccountType;
      creditLimit?: number | null;
    },
    amount: number,
    fee: number,
  ) {
    if (account.type === AccountType.credit_card) {
      const total = amount + fee;
      const availableCredit = (account.creditLimit ?? 0) + account.balance;
      if (total > availableCredit) {
        throw new Error('Insufficient credit limit');
      }
    } else {
      const total = amount + fee;
      if (total > account.balance) {
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
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const exchangeRates: Record<string, Record<string, number>> = {
      VND: { USD: 1 / 25000 },
      USD: { VND: 25000 },
    };

    const rate = exchangeRates[fromCurrency]?.[toCurrency];
    if (!rate) {
      throw new Error(
        `Currency conversion not supported: ${fromCurrency} to ${toCurrency}`,
      );
    }

    return Math.round(amount * rate);
  }

  private async applyBalanceEffect(
    tx: PrismaTx,
    transactionType: TransactionType,
    accountId: string,
    toAccountId: string | null | undefined,
    amount: number,
    fee: number,
    currency: Currency,
    accountCurrency: Currency,
    toAccountCurrency?: Currency,
  ) {
    const account = await tx.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { id: true, balance: true, type: true, creditLimit: true },
    });

    let amountInAccountCurrency = amount;
    if (currency !== accountCurrency) {
      amountInAccountCurrency = this.convertCurrency(
        amount,
        currency,
        accountCurrency,
      );
    }

    let feeInAccountCurrency = fee;
    if (currency !== accountCurrency) {
      feeInAccountCurrency = this.convertCurrency(
        fee,
        currency,
        accountCurrency,
      );
    }

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amountInAccountCurrency } },
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
              decrement: amountInAccountCurrency + feeInAccountCurrency,
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

        let amountInToAccountCurrency = amount;
        if (toAccountCurrency && currency !== toAccountCurrency) {
          amountInToAccountCurrency = this.convertCurrency(
            amount,
            currency,
            toAccountCurrency,
          );
        }

        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              decrement: amountInAccountCurrency + feeInAccountCurrency,
            },
          },
        });
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amountInToAccountCurrency } },
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
    amount: number,
    fee: number,
    currency: Currency,
    accountCurrency: Currency,
    toAccountCurrency?: Currency,
  ) {
    let amountInAccountCurrency = amount;
    if (currency !== accountCurrency) {
      amountInAccountCurrency = this.convertCurrency(
        amount,
        currency,
        accountCurrency,
      );
    }

    let feeInAccountCurrency = fee;
    if (currency !== accountCurrency) {
      feeInAccountCurrency = this.convertCurrency(
        fee,
        currency,
        accountCurrency,
      );
    }

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amountInAccountCurrency } },
        });
        break;

      case TransactionType.expense:
      case TransactionType.loan_given:
      case TransactionType.investment:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: amountInAccountCurrency + feeInAccountCurrency,
            },
          },
        });
        break;

      case TransactionType.transfer: {
        if (!toAccountId) {
          throw new Error('To account is required for transfer');
        }

        let amountInToAccountCurrency = amount;
        if (toAccountCurrency && currency !== toAccountCurrency) {
          amountInToAccountCurrency = this.convertCurrency(
            amount,
            currency,
            toAccountCurrency,
          );
        }

        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: amountInAccountCurrency + feeInAccountCurrency,
            },
          },
        });
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { decrement: amountInToAccountCurrency } },
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

    const fee = data.fee ?? 0;
    let priceInBaseCurrency = data.priceInBaseCurrency ?? null;
    let feeInBaseCurrency = data.feeInBaseCurrency ?? null;

    if (currency !== user.baseCurrency) {
      if (data.price && !priceInBaseCurrency) {
        priceInBaseCurrency = this.convertCurrency(
          data.price,
          currency,
          user.baseCurrency,
        );
      }
      if (fee > 0 && !feeInBaseCurrency) {
        feeInBaseCurrency = this.convertCurrency(
          fee,
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
      amount: data.amount,
      currency,
      price: data.price ?? null,
      priceInBaseCurrency,
      quantity: data.quantity ?? null,
      fee,
      feeInBaseCurrency,
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
          data.amount,
          fee,
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
        data.amount,
        fee,
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
