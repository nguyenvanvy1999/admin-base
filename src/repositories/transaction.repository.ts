import { prisma } from '@server/configs/db';
import type { Prisma, TransactionWhereInput } from '@server/generated';
import { TransactionType } from '@server/generated';
import { TRANSACTION_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

// Define the full entity type based on the select object
type TransactionRecord = Prisma.TransactionGetPayload<{
  select: typeof TRANSACTION_SELECT_FULL;
}>;

export class TransactionRepository extends BaseRepository<
  typeof prisma.transaction,
  TransactionRecord,
  typeof TRANSACTION_SELECT_FULL
> {
  constructor() {
    // Pass the prisma delegate and the default select object to the base class
    super(prisma.transaction, TRANSACTION_SELECT_FULL);
  }

  // This is a specific method that doesn't fit the base repository pattern
  findManyForDebtCalculation(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<TransactionRecord[]> {
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

    return prisma.transaction.findMany({
      where,
      select: TRANSACTION_SELECT_FULL,
      orderBy: {
        date: 'desc',
      },
    });
  }
}

export const transactionRepository = new TransactionRepository();
