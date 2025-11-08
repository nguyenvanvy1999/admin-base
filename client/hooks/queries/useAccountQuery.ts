import { api } from '@client/libs/api';
import type { AccountFull } from '@client/types/account';
import { useQuery } from '@tanstack/react-query';

export const useAccountQuery = (accountId: string | null) => {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      if (!accountId) return null;

      const response = await api.api.accounts({ id: accountId }).get();

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch account',
        );
      }

      return response.data as AccountFull | null;
    },
    enabled: !!accountId,
  });
};
