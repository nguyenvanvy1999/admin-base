import { useQuery } from '@tanstack/react-query';
import type { MutationCallbacks } from 'src/hooks/api/useMutation';
import { useAppMutation } from 'src/hooks/api/useMutation';
import { usePagination } from 'src/hooks/pagination';
import { userIpWhitelistService } from 'src/services/api/admin/user-ip-whitelists.service';
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
  options?: MutationCallbacks<UserIpWhitelist, Error, UserIpWhitelistFormData>,
) {
  return useAppMutation<UserIpWhitelist, Error, UserIpWhitelistFormData>({
    mutationFn: (data) => userIpWhitelistService.upsert(data),
    invalidateKeys: [[USER_IP_WHITELIST_QUERY_KEY]],
    successMessageKey: 'common.messages.saveSuccess',
    successMessageDefault: 'Saved successfully',
    errorMessageKey: 'errors.generic',
    errorMessageDefault: 'Failed to save',
    ...options,
  });
}

export function useDeleteUserIpWhitelists(
  options?: MutationCallbacks<{ count: number }, Error, string[]>,
) {
  return useAppMutation<{ count: number }, Error, string[]>({
    mutationFn: (ids) => userIpWhitelistService.delete(ids),
    invalidateKeys: [[USER_IP_WHITELIST_QUERY_KEY]],
    successMessageKey: 'common.messages.deleteSuccess',
    successMessageDefault: 'Deleted successfully',
    errorMessageKey: 'errors.generic',
    errorMessageDefault: 'Failed to delete',
    ...options,
  });
}

interface UseAdminUserIpWhitelistPaginationOptions {
  initialParams?: UserIpWhitelistListParams;
  pageSize?: number;
  autoLoad?: boolean;
}

export function useAdminUserIpWhitelistPagination(
  options: UseAdminUserIpWhitelistPaginationOptions,
) {
  const { initialParams = {}, pageSize = 20, autoLoad = true } = options;

  const pagination = usePagination(useListUserIpWhitelists, {
    initialParams,
    pageSize,
    autoLoad,
  });

  return {
    whitelists: pagination.data,
    total: pagination.total,
    pagination: pagination.pagination,
    isLoading: pagination.isLoading,
    isInitialLoading: pagination.isInitialLoading,
    reload: pagination.reload,
    goToPage: pagination.goToPage,
    changePageSize: pagination.changePageSize,
    updateParams: pagination.updateParams,
  };
}
