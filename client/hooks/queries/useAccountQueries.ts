import { api } from '@client/libs/api';
import { useQuery } from '@tanstack/react-query';

type ListAccountsQuery = {
  type?: string;
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
        query: query as any,
      });

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch accounts',
        );
      }

      return response.data as {
        accounts: Array<{
          id: string;
          type: string;
          name: string;
          currencyId: string;
          balance: string;
          creditLimit: string | null;
          expiryDate: string | null;
          meta: any;
          createdAt: string;
          updatedAt: string;
          currency: {
            id: string;
            code: string;
            name: string;
            symbol: string | null;
          };
        }>;
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
