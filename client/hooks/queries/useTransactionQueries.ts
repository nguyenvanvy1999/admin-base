import { transactionService } from '@client/services';
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
    queryFn: () => {
      return transactionService.listTransactions(query);
    },
  });
};
