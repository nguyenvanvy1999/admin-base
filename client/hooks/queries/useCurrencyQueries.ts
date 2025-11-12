import { get } from '@client/libs/http';
import type {
  CurrencyListResponse,
  Currency as CurrencyResponse,
} from '@server/dto/currency.dto';
import { useQuery } from '@tanstack/react-query';

export type Currency = CurrencyResponse;

export const useCurrenciesQuery = () => {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => {
      return get<CurrencyListResponse>('/api/currencies');
    },
    staleTime: 1000 * 60 * 60,
  });
};
