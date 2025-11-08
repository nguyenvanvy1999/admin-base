import { prisma } from '@server/db';
import {
  AccountType,
  type Currency,
  TransactionType,
} from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';

interface CreateTransactionData {
  accountId: string;
  toAccountId?: string | null;
  type: TransactionType;
  categoryId?: string | null;
  investmentId?: string | null;
  loanPartyId?: string | null;
  amount: number;
  currency?: Currency;
  price?: number | null;
  priceInBaseCurrency?: number | null;
  quantity?: number | null;
  fee?: number;
  feeInBaseCurrency?: number | null;
  date: Date;
  dueDate?: Date | null;
  note?: string | null;
  receiptUrl?: string | null;
  metadata?: any;
}

interface UpdateTransactionData extends Partial<CreateTransactionData> {}

interface ListTransactionsFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  investmentId?: string;
  loanPartyId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export class TransactionService {
  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });
    if (!account) {
      throw new Error('Account not found or not owned by user');
    }
    return account;
  }

  private async validateToAccountOwnership(
    userId: string,
    toAccountId: string,
  ) {
    const account = await prisma.account.findFirst({
      where: {
        id: toAccountId,
        userId,
      },
    });
    if (!account) {
      throw new Error('To account not found or not owned by user');
    }
    return account;
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });
    if (!category) {
      throw new Error('Category not found or not owned by user');
    }
    return category;
  }

  private async validateInvestmentOwnership(
    userId: string,
    investmentId: string,
  ) {
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId,
      },
    });
    if (!investment) {
      throw new Error('Investment not found or not owned by user');
    }
    return investment;
  }

  private async validateLoanPartyOwnership(
    userId: string,
    loanPartyId: string,
  ) {
    const loanParty = await prisma.loanParty.findFirst({
      where: {
        id: loanPartyId,
        userId,
      },
    });
    if (!loanParty) {
      throw new Error('Loan party not found or not owned by user');
    }
    return loanParty;
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

  private validateTransactionType(data: CreateTransactionData) {
    switch (data.type) {
      case TransactionType.income:
        if (!data.categoryId) {
          throw new Error('Category is required for income transactions');
        }
        break;
      case TransactionType.expense:
        if (!data.categoryId) {
          throw new Error('Category is required for expense transactions');
        }
        break;
      case TransactionType.transfer:
        if (!data.toAccountId) {
          throw new Error('To account is required for transfer transactions');
        }
        break;
      case TransactionType.loan_given:
        if (!data.loanPartyId) {
          throw new Error('Loan party is required for loan given transactions');
        }
        break;
      case TransactionType.loan_received:
        if (!data.loanPartyId) {
          throw new Error(
            'Loan party is required for loan received transactions',
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
    tx: any,
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
    tx: any,
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

  async createTransaction(userId: string, data: CreateTransactionData) {
    this.validateTransactionType(data);

    const account = await this.validateAccountOwnership(userId, data.accountId);
    const currency = data.currency ?? account.currency;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
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

    return prisma.$transaction(async (tx) => {
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
        data: {
          userId,
          accountId: data.accountId,
          toAccountId: data.toAccountId,
          type: data.type,
          categoryId: data.categoryId,
          investmentId: data.investmentId,
          loanPartyId: data.loanPartyId,
          amount: data.amount,
          currency,
          price: data.price,
          priceInBaseCurrency,
          quantity: data.quantity,
          fee,
          feeInBaseCurrency,
          date: data.date,
          dueDate: data.dueDate,
          note: data.note,
          receiptUrl: data.receiptUrl,
          metadata: data.metadata,
        },
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

  async listTransactions(
    userId: string,
    filters: ListTransactionsFilters = {},
  ) {
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

    const where: any = {
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
        where.date.gte = dateFrom;
      }
      if (dateTo) {
        where.date.lte = dateTo;
      }
    }

    const orderBy: any = {};
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

  async updateTransaction(
    userId: string,
    transactionId: string,
    data: UpdateTransactionData,
  ) {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        account: true,
        toAccount: true,
      },
    });

    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    const account = existingTransaction.account;
    const currency = data.currency ?? existingTransaction.currency;

    if (data.accountId && data.accountId !== existingTransaction.accountId) {
      await this.validateAccountOwnership(userId, data.accountId);
    }

    if (
      data.toAccountId &&
      data.toAccountId !== existingTransaction.toAccountId
    ) {
      await this.validateToAccountOwnership(userId, data.toAccountId);
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

    if (data.type) {
      this.validateTransactionType({
        ...existingTransaction,
        ...data,
      } as CreateTransactionData);
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const updateData: any = {};
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.toAccountId !== undefined)
      updateData.toAccountId = data.toAccountId;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.investmentId !== undefined)
      updateData.investmentId = data.investmentId;
    if (data.loanPartyId !== undefined)
      updateData.loanPartyId = data.loanPartyId;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.fee !== undefined) updateData.fee = data.fee;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const finalAmount = data.amount ?? existingTransaction.amount;
    const finalFee = data.fee ?? existingTransaction.fee;
    const finalType = data.type ?? existingTransaction.type;
    const finalToAccountId =
      data.toAccountId ?? existingTransaction.toAccountId;
    const finalAccountId = data.accountId ?? existingTransaction.accountId;
    const finalAccount = data.accountId
      ? await prisma.account.findUniqueOrThrow({
          where: { id: data.accountId },
        })
      : account;
    const finalToAccount = finalToAccountId
      ? await prisma.account.findFirst({ where: { id: finalToAccountId } })
      : existingTransaction.toAccount;

    let priceInBaseCurrency =
      data.priceInBaseCurrency ?? existingTransaction.priceInBaseCurrency;
    let feeInBaseCurrency =
      data.feeInBaseCurrency ?? existingTransaction.feeInBaseCurrency;

    if (currency !== user.baseCurrency) {
      if (data.price && !priceInBaseCurrency) {
        priceInBaseCurrency = this.convertCurrency(
          data.price,
          currency,
          user.baseCurrency,
        );
      }
      if (finalFee > 0 && !feeInBaseCurrency) {
        feeInBaseCurrency = this.convertCurrency(
          finalFee,
          currency,
          user.baseCurrency,
        );
      }
    }

    if (priceInBaseCurrency !== undefined) {
      updateData.priceInBaseCurrency = priceInBaseCurrency;
    }
    if (feeInBaseCurrency !== undefined) {
      updateData.feeInBaseCurrency = feeInBaseCurrency;
    }

    return prisma.$transaction(async (tx) => {
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
        finalType,
        finalAccountId,
        finalToAccountId,
        finalAmount,
        finalFee,
        currency,
        finalAccount.currency,
        finalToAccount?.currency,
      );

      return tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
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

  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        account: true,
        toAccount: true,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    await prisma.$transaction(async (tx) => {
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
