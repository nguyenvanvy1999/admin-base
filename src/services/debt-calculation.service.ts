import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import { TransactionType } from '@server/generated';
import {
  dateToIsoString,
  dateToNullableIsoString,
  decimalToNullableString,
  decimalToString,
} from '@server/share';
import Decimal from 'decimal.js';
import type { TransactionDetail } from '../dto/transaction.dto';
import {
  type TransactionRepository,
  transactionRepository,
} from '../repositories/transaction.repository';

interface EntityDebtData {
  loans: Array<{
    id: string;
    type: TransactionType;
    amount: Decimal;
    date: Date;
    transaction: any;
  }>;
  totalRepaid: Decimal;
  totalCollected: Decimal;
}

export class DebtCalculationService {
  constructor(
    private readonly deps: {
      db: IDb;
      transactionRepository: TransactionRepository;
    } = { db: prisma, transactionRepository: transactionRepository },
  ) {}

  async getUnpaidDebts(
    userId: string,
    query?: {
      from?: string;
      to?: string;
    },
  ): Promise<Array<TransactionDetail & { remainingAmount: number }>> {
    const dateFrom = query?.from ? new Date(query.from) : undefined;
    const dateTo = query?.to ? new Date(query.to) : undefined;

    const allLoanTransactions =
      await this.deps.transactionRepository.findManyForDebtCalculation(
        userId,
        dateFrom,
        dateTo,
      );

    const entityDebtMap = this.groupTransactionsByEntity(allLoanTransactions);
    return this.calculateRemainingDebts(entityDebtMap);
  }

  private groupTransactionsByEntity(
    transactions: any[],
  ): Map<string, EntityDebtData> {
    const entityDebtMap = new Map<string, EntityDebtData>();

    for (const tx of transactions) {
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
          transaction: tx,
        });
      } else if (tx.type === TransactionType.repay_debt) {
        entityDebt.totalRepaid = entityDebt.totalRepaid.plus(amount);
      } else if (tx.type === TransactionType.collect_debt) {
        entityDebt.totalCollected = entityDebt.totalCollected.plus(amount);
      }
    }

    return entityDebtMap;
  }

  private calculateRemainingDebts(
    entityDebtMap: Map<string, EntityDebtData>,
  ): Array<TransactionDetail & { remainingAmount: number }> {
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
          const formatted = this.formatTransactionRecord(loan.transaction);
          debtTransactions.push({
            ...formatted,
            remainingAmount,
          });
        }
      }
    }

    return debtTransactions;
  }

  private formatTransactionRecord(transaction: any): TransactionDetail {
    const formatCurrencyRecord = (currency: any) => {
      if (!currency) return null;
      return {
        ...currency,
        symbol: currency.symbol ?? null,
      };
    };

    const formatAccountRecord = (account: any) => ({
      ...account,
      currency: formatCurrencyRecord(account.currency)!,
    });

    const formatOptionalAccountRecord = (account: any) => {
      if (!account) return null;
      return formatAccountRecord(account);
    };

    const formatCategoryRecord = (category: any) => {
      if (!category) return null;
      return {
        ...category,
        icon: category.icon ?? null,
        color: category.color ?? null,
      };
    };

    const formatEntityRecord = (entity: any) => {
      if (!entity) return null;
      return { ...entity };
    };

    const formatEventRecord = (event: any) => {
      if (!event) return null;
      return {
        id: event.id,
        name: event.name,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt ? event.endAt.toISOString() : null,
      };
    };

    return {
      ...transaction,
      toAccountId: transaction.toAccountId ?? null,
      transferGroupId: transaction.transferGroupId ?? null,
      categoryId: transaction.categoryId,
      entityId: transaction.entityId ?? null,
      investmentId: transaction.investmentId ?? null,
      eventId: transaction.eventId ?? null,
      amount: decimalToString(transaction.amount),
      price: decimalToNullableString(transaction.price),
      priceInBaseCurrency: decimalToNullableString(
        transaction.priceInBaseCurrency,
      ),
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
    };
  }
}

export const debtCalculationService = new DebtCalculationService();
