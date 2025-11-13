import { exchangeRateService } from '@client/services';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export const useRefreshExchangeRateMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => exchangeRateService.refresh(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rate'] });
      if (data.success) {
        toast.success({
          i18nKey: t('api.exchange_rate_refreshed', {
            defaultValue: 'Exchange rates refreshed successfully',
          }),
          type: 'success',
        });
      } else {
        toast.error({
          i18nKey: t('api.exchange_rate_refresh_failed', {
            defaultValue: 'Failed to refresh exchange rates',
          }),
          type: 'error',
        });
      }
    },
  });
};
