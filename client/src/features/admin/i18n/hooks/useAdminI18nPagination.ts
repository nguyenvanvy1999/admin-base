import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminI18nList } from 'src/hooks/api/useAdminI18n';
import type { I18nListParams } from 'src/types/admin-i18n';

interface UseAdminI18nPaginationOptions {
  initialParams?: I18nListParams;
  pageSize?: number;
  autoLoad?: boolean;
}

export function useAdminI18nPagination(options: UseAdminI18nPaginationOptions) {
  const { initialParams = {}, pageSize = 20, autoLoad = true } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [params, setParams] = useState<I18nListParams>(initialParams);

  const queryParams = useMemo(
    () => ({
      ...params,
      skip: (currentPage - 1) * currentPageSize,
      take: currentPageSize,
    }),
    [params, currentPage, currentPageSize],
  );

  const { data, isLoading, isFetching, refetch } =
    useAdminI18nList(queryParams);

  const i18nEntries = data?.docs ?? [];
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

  const updateParams = useCallback((newParams: I18nListParams) => {
    setParams(newParams);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    if (autoLoad) {
      refetch();
    }
  }, [queryParams, autoLoad, refetch]);

  return {
    i18nEntries,
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
