import { exchangeRateService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useExchangeRateInfoQuery = () => {
  return useQuery({
    queryKey: ['exchange-rate', 'info'],
    queryFn: () => exchangeRateService.getInfo(),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });
};

export const useExchangeRateHealthQuery = () => {
  return useQuery({
    queryKey: ['exchange-rate', 'health'],
    queryFn: () => exchangeRateService.getHealth(),
    refetchInterval: 60000,
    staleTime: 30000,
  });
};
