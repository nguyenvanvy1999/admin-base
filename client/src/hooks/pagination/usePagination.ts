import type { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

export interface PaginatedResponse<T> {
  docs: T[];
  count: number;
}

export interface UsePaginationOptions<TParams extends Record<string, any>> {
  initialParams?: TParams;
  pageSize?: number;
  autoLoad?: boolean;
}

export interface UsePaginationResult<
  TData,
  TParams extends Record<string, any>,
> {
  data: TData[];
  total: number;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  isLoading: boolean;
  isInitialLoading: boolean;
  reload: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  changePageSize: (size: number) => Promise<void>;
  updateParams: (params: TParams) => void;
}

export function usePagination<
  TData,
  TParams extends Record<string, any>,
  TResponse extends PaginatedResponse<TData>,
>(
  useQueryHook: (
    params: TParams & { skip: number; take: number },
    options?: { enabled?: boolean },
  ) => UseQueryResult<TResponse, Error>,
  options: UsePaginationOptions<TParams> = {},
): UsePaginationResult<TData, TParams> {
  const {
    initialParams = {} as TParams,
    pageSize = 20,
    autoLoad = true,
  } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [params, setParams] = useState<TParams>(initialParams);

  const queryParams = useMemo(
    () =>
      ({
        ...params,
        skip: (currentPage - 1) * currentPageSize,
        take: currentPageSize,
      }) as TParams & { skip: number; take: number },
    [params, currentPage, currentPageSize],
  );

  const { data, isLoading, isFetching, refetch } = useQueryHook(queryParams, {
    enabled: autoLoad,
  });

  const items = data?.docs ?? [];
  const total = data?.count ?? 0;

  const goToPage = useCallback(
    async (page: number) => {
      setCurrentPage(page);
      if (!autoLoad) {
        await refetch();
      }
    },
    [autoLoad, refetch],
  );

  const changePageSize = useCallback(
    async (newPageSize: number) => {
      setCurrentPageSize(newPageSize);
      setCurrentPage(1);
      if (!autoLoad) {
        await refetch();
      }
    },
    [autoLoad, refetch],
  );

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const updateParams = useCallback((newParams: TParams) => {
    setParams(newParams);
    setCurrentPage(1);
  }, []);

  return {
    data: items,
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
