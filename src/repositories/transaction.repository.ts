import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  TransactionOrderByWithRelationInput,
  TransactionWhereInput,
} from '@server/generated';
import { TransactionType } from '@server/generated';
import {
  TRANSACTION_SELECT_FOR_BALANCE,
  TRANSACTION_SELECT_FULL,
  TRANSACTION_SELECT_MINIMAL,
} from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

export class TransactionRepository extends BaseRepository {
  constructor(db: IDb = prisma) {
    super(db);
  }

  async findByIdAndUserId(transactionId: string, userId: string) {
    return this.db.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      select: TRANSACTION_SELECT_FULL,
    });
  }

  async findByIdForBalance(transactionId: string) {
    return this.db.transaction.findUnique({
      where: { id: transactionId },
      select: TRANSACTION_SELECT_FOR_BALANCE,
    });
  }

  async findManyByUserId(
    userId: string,
    where: TransactionWhereInput,
    orderBy: TransactionOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    return this.db.transaction.findMany({
      where: {
        ...where,
        userId,
      },
      orderBy,
      skip,
      take,
      select: TRANSACTION_SELECT_FULL,
    });
  }

  async countByUserId(userId: string, where: TransactionWhereInput) {
    return this.db.transaction.count({
      where: {
        ...where,
        userId,
      },
    });
  }

  async findManyForDebtCalculation(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const where: TransactionWhereInput = {
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

    return this.db.transaction.findMany({
      where,
      select: TRANSACTION_SELECT_FULL,
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findMirrorByTransferGroupId(
    transferGroupId: string,
    select?: { amount: true } | { id: true },
  ) {
    return this.db.transaction.findFirst({
      where: {
        transferGroupId,
        isTransferMirror: true,
      },
      select: select ?? { id: true },
    });
  }
}

export const transactionRepository = new TransactionRepository();
