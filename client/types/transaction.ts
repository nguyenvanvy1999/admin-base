import type { TransactionDetail } from '@server/dto/transaction.dto';

export type TransactionFull = TransactionDetail & {
  metadata: Record<string, unknown> | null;
};

export type TransactionFormData = {
  id?: string;
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  categoryId?: string;
  toAccountId?: string;
  amount: number;
  currencyId?: string;
  fee?: number;
  date: string;
  entityId?: string | null;
  note?: string | null;
  metadata?: Record<string, any> | null;
};
