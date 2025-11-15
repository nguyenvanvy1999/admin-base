import { ServiceBase } from '@client/libs/ServiceBase';
import type { ActionRes } from '@server/dto/common.dto';
import type {
  BatchTransactionsResponse,
  IBalanceAdjustmentDto,
  IBatchTransactionsDto,
  IUpsertTransaction,
  TransactionDetail,
  TransactionListResponse,
} from '@server/dto/transaction.dto';
import type { TransactionType } from '@server/generated';

export class TransactionService extends ServiceBase {
  constructor() {
    super('/api/transactions');
  }

  listTransactions(query?: {
    types?: TransactionType[];
    accountIds?: string[];
    categoryIds?: string[];
    entityIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'date' | 'amount' | 'type' | 'accountId';
    sortOrder?: 'asc' | 'desc';
  }): Promise<TransactionListResponse> {
    return this.get<TransactionListResponse>({
      params: query,
    });
  }

  createTransaction(
    data: Omit<IUpsertTransaction, 'id'>,
  ): Promise<TransactionDetail> {
    return this.post<TransactionDetail>(data);
  }

  updateTransaction(data: IUpsertTransaction): Promise<TransactionDetail> {
    return this.post<TransactionDetail>(data);
  }

  deleteTransaction(transactionId: string): Promise<ActionRes> {
    return this.delete<ActionRes>({
      endpoint: transactionId,
    });
  }

  adjustBalance(data: IBalanceAdjustmentDto): Promise<TransactionDetail> {
    return this.post<TransactionDetail>(data, {
      endpoint: 'adjust-balance',
    });
  }

  createBatchTransactions(
    data: IBatchTransactionsDto,
  ): Promise<BatchTransactionsResponse> {
    return this.post<BatchTransactionsResponse>(data, {
      endpoint: 'batch',
    });
  }

  getDebtStatistics(query?: { from?: string; to?: string }): Promise<{
    totalLoanGiven: number;
    totalLoanReceived: number;
    totalPaid: number;
    totalReceived: number;
    currency: string;
  }> {
    return this.get({
      endpoint: 'debt-statistics',
      params: query,
    });
  }

  getDebts(query?: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<TransactionDetail[]> {
    return this.get({
      endpoint: 'debts',
      params: query,
    });
  }
}

export const transactionService = new TransactionService();
