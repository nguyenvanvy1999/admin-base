import { api } from '@client/libs/api';
import type { AccountFull } from '@client/types/account';
import type { AccountType } from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';

type ListAccountsQuery = {
  type?: AccountType[];
  currencyId?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'balance';
  sortOrder?: 'asc' | 'desc';
};

export const useAccountsQuery = (query: ListAccountsQuery = {}) => {
  return useQuery({
    queryKey: ['accounts', query],
    queryFn: async () => {
      const response = await api.api.accounts.get({
        query: query,
      });

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch accounts',
        );
      }

      const data = response.data;

      return {
        accounts: data.accounts.map((account) => ({
          ...account,
          balance: account.balance.toString(),
          creditLimit: account.creditLimit?.toString() ?? null,
        })) satisfies AccountFull[],
        pagination: data.pagination,
        summary: data.summary || [],
      };
    },
  });
};
