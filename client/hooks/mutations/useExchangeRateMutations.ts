import { exchangeRateService } from '@client/services';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useRefreshExchangeRateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => exchangeRateService.refresh(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rate'] });
      if (data.success) {
        toast.success('Exchange rates refreshed successfully');
      } else {
        toast.error(data.message || 'Failed to refresh exchange rates');
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to refresh exchange rates',
      );
    },
  });
};
