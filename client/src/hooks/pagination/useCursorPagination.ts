import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handleApiError } from 'src/lib/api/errorHandler';

export interface CursorPaginatedResponse<T> {
  docs: T[];
  hasNext: boolean;
  nextCursor?: string;
}

export interface UseCursorPaginationOptions<
  TParams extends Record<string, any>,
> {
  initialParams: Omit<TParams, 'cursor' | 'take'>;
  pageSize?: number;
  autoLoad?: boolean;
  paramsComparator?: (prev: TParams, current: TParams) => boolean;
}

export interface UseCursorPaginationResult<TData> {
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

export function useCursorPagination<
  TData,
  TParams extends Record<string, any> & { take: number; cursor?: string },
>(
  fetchFn: (params: TParams) => Promise<CursorPaginatedResponse<TData>>,
  options: UseCursorPaginationOptions<TParams>,
): UseCursorPaginationResult<TData> {
  const {
    initialParams,
    pageSize: initialPageSize = 20,
    autoLoad = true,
    paramsComparator,
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
  const prevParamsRef = useRef<TParams>({} as TParams);
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
        } as TParams;

        const result = await fetchFn(params);

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
    [fetchFn, initialParams, pageSize],
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
          } as TParams;

          const result = await fetchFn(params);

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
    [currentPage, pageCursors, fetchPage, fetchFn, initialParams, pageSize],
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
    const currentParams = initialParams as TParams;

    const hasParamsChanged = paramsComparator
      ? paramsComparator(prevParams, currentParams)
      : JSON.stringify(prevParams) !== JSON.stringify(currentParams);

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
  }, [autoLoad, initialParams, fetchPage, paramsComparator]);

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
