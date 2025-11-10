import type { TransactionType } from '@server/generated/prisma/enums';

export type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
};

export type Account = {
  id: string;
  name: string;
  currency: Currency;
};

export type Category = {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
};

export type Entity = {
  id: string;
  name: string;
  type: string | null;
};

export type TransactionFull = {
  id: string;
  userId: string;
  accountId: string;
  toAccountId: string | null;
  type: TransactionType;
  categoryId: string | null;
  investmentId: string | null;
  entityId: string | null;
  amount: string;
  currencyId: string;
  price: string | null;
  priceInBaseCurrency: string | null;
  quantity: string | null;
  fee: string;
  feeInBaseCurrency: string | null;
  date: string;
  dueDate: string | null;
  note: string | null;
  receiptUrl: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  account: Account;
  toAccount: Account | null;
  category: Category | null;
  entity: Entity | null;
  currency: Currency;
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
