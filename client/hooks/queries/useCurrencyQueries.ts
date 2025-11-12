import { currencyService } from '@client/services';
import type { Currency as CurrencyResponse } from '@server/dto/currency.dto';
import { useQuery } from '@tanstack/react-query';

export type Currency = CurrencyResponse;

export const useCurrenciesQuery = () => {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => {
      return currencyService.listCurrencies();
    },
    staleTime: 1000 * 60 * 60,
  });
};
