import { api } from '@client/libs/api';
import { useQuery } from '@tanstack/react-query';

export type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
};

export const useCurrenciesQuery = () => {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await api.api.currencies.get();

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch currencies',
        );
      }

      return response.data;
    },
    staleTime: 1000 * 60 * 60,
  });
};
