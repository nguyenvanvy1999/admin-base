import { useListUserIpWhitelists } from 'src/hooks/api/useAdminUserIpWhitelist';
import { usePagination } from 'src/hooks/pagination';
import type { UserIpWhitelistListParams } from 'src/types/admin-user-ip-whitelist';

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
    entries: pagination.data,
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
