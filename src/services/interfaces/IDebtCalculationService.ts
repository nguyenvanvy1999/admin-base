import type { TransactionDetail } from '@server/dto/transaction.dto';

export interface IDebtCalculationService {
  getUnpaidDebts(
    userId: string,
    query?: {
      from?: string;
      to?: string;
    },
  ): Promise<Array<TransactionDetail & { remainingAmount: number }>>;
}
