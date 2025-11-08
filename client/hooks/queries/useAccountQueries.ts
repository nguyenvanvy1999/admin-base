import { api } from '@client/libs/api';
import type { AccountFull } from '@client/types/account';
import { useQuery } from '@tanstack/react-query';

type ListAccountsQuery = {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt';
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

      return response.data as {
        accounts: AccountFull[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    },
  });
};
