import type { ActionRes } from '@server/dto/common.dto';
import type {
  BatchTransactionsResponse,
  IBalanceAdjustmentDto,
  IBatchTransactionsDto,
  IListTransactionsQuery,
  IUpsertTransaction,
  TransactionDetail,
  TransactionListResponse,
} from '@server/dto/transaction.dto';

export interface ITransactionService {
  upsertTransaction(
    userId: string,
    data: IUpsertTransaction,
  ): Promise<TransactionDetail>;
  getTransaction(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetail>;
  listTransactions(
    userId: string,
    filters: IListTransactionsQuery,
  ): Promise<TransactionListResponse>;
  deleteTransaction(userId: string, transactionId: string): Promise<ActionRes>;
  createBatchTransactions(
    userId: string,
    data: IBatchTransactionsDto,
  ): Promise<BatchTransactionsResponse>;
  adjustAccountBalance(
    userId: string,
    data: IBalanceAdjustmentDto,
  ): Promise<TransactionDetail>;
  getUnpaidDebts(
    userId: string,
    query?: {
      from?: string;
      to?: string;
    },
  ): Promise<Array<TransactionDetail & { remainingAmount: number }>>;
}
