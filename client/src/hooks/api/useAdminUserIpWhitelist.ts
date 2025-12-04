import {
  type UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { userIpWhitelistService } from 'src/services/api/userIpWhitelist.service';
import type {
  UserIpWhitelist,
  UserIpWhitelistFormData,
  UserIpWhitelistListParams,
} from 'src/types/admin-user-ip-whitelist';
import type { ListResponse } from 'src/types/api';

export const USER_IP_WHITELIST_QUERY_KEY = 'user-ip-whitelists';

interface UseListUserIpWhitelistsOptions {
  enabled?: boolean;
}

export function useListUserIpWhitelists(
  params: UserIpWhitelistListParams,
  options?: UseListUserIpWhitelistsOptions,
) {
  return useQuery<ListResponse<UserIpWhitelist>>({
    queryKey: [USER_IP_WHITELIST_QUERY_KEY, params],
    queryFn: () => userIpWhitelistService.list(params),
    enabled: options?.enabled,
  });
}

export function useUpsertUserIpWhitelist(
  options?: UseMutationOptions<UserIpWhitelist, Error, UserIpWhitelistFormData>,
) {
  const { t } = useTranslation();

  return useMutation<UserIpWhitelist, Error, UserIpWhitelistFormData>({
    mutationFn: (data) => userIpWhitelistService.upsert(data),
    onSuccess: () => {
      message.success(t('common.messages.saveSuccess'));
    },
    onError: (error) => {
      message.error(error.message || t('errors.generic'));
    },
    ...options,
  });
}

export function useDeleteUserIpWhitelists(
  options?: UseMutationOptions<{ count: number }, Error, string[]>,
) {
  const { t } = useTranslation();

  return useMutation<{ count: number }, Error, string[]>({
    mutationFn: (ids) => userIpWhitelistService.delete(ids),
    onSuccess: () => {
      message.success(t('common.messages.deleteSuccess'));
    },
    onError: (error) => {
      message.error(error.message || t('errors.generic'));
    },
    ...options,
  });
}
