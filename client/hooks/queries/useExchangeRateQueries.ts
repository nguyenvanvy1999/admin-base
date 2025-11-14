import { exchangeRateService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useExchangeRateHealthQuery = () => {
  return useQuery({
    queryKey: ['exchange-rate', 'health'],
    queryFn: () => exchangeRateService.getHealth(),
    refetchInterval: 60000,
    staleTime: 30000,
  });
};
