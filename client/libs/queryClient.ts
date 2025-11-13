import i18n from '@client/i18n';
import { toast } from '@client/utils/toast';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= 3) {
          return false;
        }
        const err = error as Error & { status?: number };
        if (err.status && err.status >= 400 && err.status < 500) {
          return false;
        }
        return true;
      },
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      onError: (error) => {
        const err = error as Error & { code?: string };
        const errorCode = err.code || 'ise';
        const i18nKey = `api.${errorCode}`;
        const message = i18n.exists(i18nKey)
          ? i18n.t(i18nKey as any)
          : err.message || i18n.t('api.ise' as any);
        toast.error({ i18nKey: message, type: 'error' });
      },
    },
  },
});
