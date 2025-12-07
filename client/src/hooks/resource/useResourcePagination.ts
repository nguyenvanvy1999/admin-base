import { useCursorPagination } from 'src/hooks/pagination';
import type { ResourceContext } from 'src/types/resource';

export interface UseResourcePaginationOptions<
  TData,
  TListParams extends Record<string, any>,
> {
  resource: ResourceContext<TData, TListParams, any>;
  initialParams: Omit<TListParams, 'cursor' | 'take'>;
  pageSize?: number;
  autoLoad?: boolean;
}

export interface UseResourcePaginationResult<TData> {
  data: TData[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
  isLoading: boolean;
  isInitialLoading: boolean;
  reload: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  changePageSize: (size: number) => Promise<void>;
}

export function useResourcePagination<
  TData,
  TListParams extends Record<string, any>,
>(
  options: UseResourcePaginationOptions<TData, TListParams>,
): UseResourcePaginationResult<TData> {
  const {
    resource,
    initialParams,
    pageSize: initialPageSize = 20,
    autoLoad = true,
  } = options;

  return useCursorPagination<
    TData,
    TListParams & { take: number; cursor?: string }
  >(async (params) => resource.listService(params as TListParams), {
    initialParams: initialParams as Omit<
      TListParams & { take: number; cursor?: string },
      'cursor' | 'take'
    >,
    pageSize: initialPageSize,
    autoLoad,
  });
}
