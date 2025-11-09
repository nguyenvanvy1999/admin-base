import { api } from '@client/libs/api';
import type { TransactionFull } from '@client/types/transaction';
import type { TransactionType } from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';

type ListTransactionsQuery = {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
};

export const useTransactionsQuery = (query: ListTransactionsQuery = {}) => {
  return useQuery({
    queryKey: ['transactions', query],
    queryFn: async () => {
      const response = await api.api.transactions.get({
        query: query,
      });

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch transactions',
        );
      }

      const data = response.data;

      return {
        transactions: data.transactions.map((transaction) => ({
          ...transaction,
          amount: transaction.amount.toString(),
          fee: transaction.fee.toString(),
          price: transaction.price?.toString() ?? null,
          priceInBaseCurrency:
            transaction.priceInBaseCurrency?.toString() ?? null,
          quantity: transaction.quantity?.toString() ?? null,
          feeInBaseCurrency: transaction.feeInBaseCurrency?.toString() ?? null,
          date:
            transaction.date instanceof Date
              ? transaction.date.toISOString()
              : transaction.date,
          dueDate:
            transaction.dueDate instanceof Date
              ? transaction.dueDate.toISOString()
              : (transaction.dueDate ?? null),
          createdAt:
            transaction.createdAt instanceof Date
              ? transaction.createdAt.toISOString()
              : transaction.createdAt,
          updatedAt:
            transaction.updatedAt instanceof Date
              ? transaction.updatedAt.toISOString()
              : transaction.updatedAt,
          metadata:
            transaction.metadata && typeof transaction.metadata === 'object'
              ? (transaction.metadata as Record<string, any>)
              : null,
        })) satisfies TransactionFull[],
        pagination: data.pagination,
      };
    },
  });
};
