import { api } from '@client/libs/api';
import { useQuery } from '@tanstack/react-query';

export const useAccountQuery = (accountId: string | null) => {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      if (!accountId) return null;

      const response = await api.api.accounts[accountId].get();

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch account',
        );
      }

      return response.data as {
        id: string;
        type: string;
        name: string;
        currencyId: string;
        balance: string;
        creditLimit: string | null;
        meta: any;
        createdAt: string;
        updatedAt: string;
        currency: {
          id: string;
          code: string;
          name: string;
          symbol: string | null;
        };
      };
    },
    enabled: !!accountId,
  });
};
