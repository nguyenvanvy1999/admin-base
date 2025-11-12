import { get } from '@client/libs/http';
import type { TransactionFull } from '@client/types/transaction';
import type { TransactionListResponse } from '@server/dto/transaction.dto';
import type { TransactionType } from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';

type ListTransactionsQuery = {
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
};

export const useTransactionsQuery = (query: ListTransactionsQuery = {}) => {
  return useQuery({
    queryKey: ['transactions', query],
    queryFn: async () => {
      const data = await get<TransactionListResponse>('/api/transactions', {
        query,
      });

      return {
        transactions: data.transactions.map((transaction) => ({
          ...transaction,
          amount:
            typeof transaction.amount === 'string'
              ? transaction.amount
              : (transaction.amount?.toString() ?? '0'),
          fee:
            typeof transaction.fee === 'string'
              ? transaction.fee
              : (transaction.fee?.toString() ?? '0'),
          price:
            transaction.price === null
              ? null
              : typeof transaction.price === 'string'
                ? transaction.price
                : (transaction.price?.toString() ?? null),
          priceInBaseCurrency:
            transaction.priceInBaseCurrency === null
              ? null
              : typeof transaction.priceInBaseCurrency === 'string'
                ? transaction.priceInBaseCurrency
                : (transaction.priceInBaseCurrency?.toString() ?? null),
          quantity:
            transaction.quantity === null
              ? null
              : typeof transaction.quantity === 'string'
                ? transaction.quantity
                : (transaction.quantity?.toString() ?? null),
          feeInBaseCurrency:
            transaction.feeInBaseCurrency === null
              ? null
              : typeof transaction.feeInBaseCurrency === 'string'
                ? transaction.feeInBaseCurrency
                : (transaction.feeInBaseCurrency?.toString() ?? null),
          date:
            typeof transaction.date === 'string'
              ? transaction.date
              : transaction.date instanceof Date
                ? transaction.date.toISOString()
                : String(transaction.date),
          dueDate:
            transaction.dueDate === null
              ? null
              : typeof transaction.dueDate === 'string'
                ? transaction.dueDate
                : transaction.dueDate instanceof Date
                  ? transaction.dueDate.toISOString()
                  : String(transaction.dueDate),
          createdAt:
            typeof transaction.createdAt === 'string'
              ? transaction.createdAt
              : transaction.createdAt instanceof Date
                ? transaction.createdAt.toISOString()
                : String(transaction.createdAt),
          updatedAt:
            typeof transaction.updatedAt === 'string'
              ? transaction.updatedAt
              : transaction.updatedAt instanceof Date
                ? transaction.updatedAt.toISOString()
                : String(transaction.updatedAt),
          metadata:
            transaction.metadata && typeof transaction.metadata === 'object'
              ? (transaction.metadata as Record<string, any>)
              : null,
        })) satisfies TransactionFull[],
        pagination: data.pagination,
        summary: data.summary || [],
      };
    },
  });
};
