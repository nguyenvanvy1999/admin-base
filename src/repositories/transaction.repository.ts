import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { TransactionWhereInput } from '@server/generated';
import { TransactionType } from '@server/generated';
import { TRANSACTION_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

export class TransactionRepository extends BaseRepository {
  constructor(db: IDb = prisma) {
    super(db);
  }

  findManyForDebtCalculation(userId: string, dateFrom?: Date, dateTo?: Date) {
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
}

export const transactionRepository = new TransactionRepository();
