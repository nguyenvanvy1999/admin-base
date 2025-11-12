import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  IUpsertTransaction,
  TransactionDeleteResponse,
  TransactionDetail,
  TransactionListResponse,
} from '@server/dto/transaction.dto';
import type { TransactionType } from '@server/generated/prisma/enums';

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
    const payload = {
      ...data,
      note: data.note ?? undefined,
      entityId: data.entityId ?? undefined,
      metadata: data.metadata ?? undefined,
    };
    return this.post<TransactionDetail>(payload);
  }

  updateTransaction(data: IUpsertTransaction): Promise<TransactionDetail> {
    const payload = {
      ...data,
      note: data.note ?? undefined,
      entityId: data.entityId ?? undefined,
      metadata: data.metadata ?? undefined,
    };
    return this.post<TransactionDetail>(payload);
  }

  deleteTransaction(transactionId: string): Promise<TransactionDeleteResponse> {
    return this.delete<TransactionDeleteResponse>({
      endpoint: transactionId,
    });
  }
}

export const transactionService = new TransactionService();
