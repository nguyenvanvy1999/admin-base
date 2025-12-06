import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handleApiError } from 'src/lib/api/errorHandler';
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

  const [data, setData] = useState<TData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageCursors, setPageCursors] = useState<Map<number, string | null>>(
    new Map([[1, null]]),
  );
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const prevParamsRef = useRef<TListParams>({} as TListParams);
  const isAutoLoadingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchPage = useCallback(
    async (page: number, cursor: string | null) => {
      setIsLoading(true);
      if (page === 1) {
        setIsInitialLoading(true);
      }

      try {
        const params = {
          ...initialParams,
          take: pageSize,
          cursor: cursor ?? undefined,
        } as unknown as TListParams;

        const result = await resource.listService(params);

        setData(result.docs);
        setHasNext(result.hasNext ?? false);

        if (result.nextCursor) {
          setPageCursors((prev) => {
            const newMap = new Map(prev);
            newMap.set(page + 1, result.nextCursor!);
            return newMap;
          });
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
        setIsInitialLoading(false);
        hasLoadedOnceRef.current = true;
      }
    },
    [resource, initialParams, pageSize],
  );

  const reload = useCallback(async () => {
    setPageCursors(new Map([[1, null]]));
    setCurrentPage(1);
    await fetchPage(1, null);
  }, [fetchPage]);

  const goToPage = useCallback(
    async (page: number) => {
      if (page < 1 || page === currentPage) return;

      const cursor = pageCursors.get(page);
      if (cursor !== undefined) {
        await fetchPage(page, cursor);
        setCurrentPage(page);
      } else if (page > currentPage) {
        let targetCursor: string | null = pageCursors.get(currentPage) ?? null;
        let targetPage = currentPage;

        while (targetPage < page) {
          const params = {
            ...initialParams,
            take: pageSize,
            cursor: targetCursor ?? undefined,
          } as unknown as TListParams;

          const result = await resource.listService(params);

          targetPage += 1;
          targetCursor = result.nextCursor ?? null;

          if (targetCursor) {
            setPageCursors((prev) => {
              const newMap = new Map(prev);
              newMap.set(targetPage + 1, targetCursor!);
              return newMap;
            });
          }

          if (targetPage === page) {
            setData(result.docs);
            setCurrentPage(page);
            setHasNext(result.hasNext ?? false);
            setIsLoading(false);
            setIsInitialLoading(false);
            break;
          }
        }
      } else {
        const prevCursor = pageCursors.get(page);
        if (prevCursor !== undefined) {
          await fetchPage(page, prevCursor);
          setCurrentPage(page);
        }
      }
    },
    [currentPage, pageCursors, fetchPage, resource, initialParams, pageSize],
  );

  const changePageSize = useCallback(
    async (size: number) => {
      setPageSize(size);
      setPageCursors(new Map([[1, null]]));
      setCurrentPage(1);
      await fetchPage(1, null);
    },
    [fetchPage],
  );

  const total = useMemo(() => {
    const loadedCount = (currentPage - 1) * pageSize + data.length;
    return hasNext ? loadedCount + 1 : loadedCount;
  }, [currentPage, hasNext, pageSize, data.length]);

  useEffect(() => {
    if (!autoLoad) return;

    const prevParams = prevParamsRef.current;
    const currentParams = initialParams as TListParams;

    const hasParamsChanged =
      JSON.stringify(prevParams) !== JSON.stringify(currentParams);

    const shouldLoad = !hasLoadedOnceRef.current || hasParamsChanged;

    if (shouldLoad && !isAutoLoadingRef.current) {
      prevParamsRef.current = currentParams;
      hasLoadedOnceRef.current = false;
      setPageCursors(new Map([[1, null]]));
      setCurrentPage(1);
      isAutoLoadingRef.current = true;
      void (async () => {
        try {
          await fetchPage(1, null);
        } finally {
          isAutoLoadingRef.current = false;
        }
      })();
    }
  }, [autoLoad, initialParams, fetchPage]);

  return {
    data,
    pagination: {
      current: currentPage,
      pageSize,
      total,
      hasNext,
    },
    isLoading,
    isInitialLoading,
    reload,
    goToPage,
    changePageSize,
  };
}
