import { useCallback, useEffect, useMemo, useState } from 'react';
import { useListUserIpWhitelists } from 'src/hooks/api/useAdminUserIpWhitelist';
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

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [params, setParams] =
    useState<UserIpWhitelistListParams>(initialParams);

  const queryParams = useMemo(
    () => ({
      ...params,
      skip: (currentPage - 1) * currentPageSize,
      take: currentPageSize,
    }),
    [params, currentPage, currentPageSize],
  );

  const { data, isLoading, isFetching, refetch } =
    useListUserIpWhitelists(queryParams);

  const entries = data?.docs ?? [];
  const total = data?.count ?? 0;

  const goToPage = useCallback(
    async (page: number) => {
      setCurrentPage(page);
      await refetch();
    },
    [refetch],
  );

  const changePageSize = useCallback(
    async (newPageSize: number) => {
      setCurrentPageSize(newPageSize);
      setCurrentPage(1);
      await refetch();
    },
    [refetch],
  );

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const updateParams = useCallback((newParams: UserIpWhitelistListParams) => {
    setParams(newParams);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    if (autoLoad) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams, autoLoad]);

  return {
    entries,
    total,
    pagination: {
      current: currentPage,
      pageSize: currentPageSize,
      total,
    },
    isLoading: isLoading || isFetching,
    isInitialLoading: isLoading,
    reload,
    goToPage,
    changePageSize,
    updateParams,
  };
}
