import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handleApiError } from 'src/lib/api/errorHandler';
import { adminSessionsService } from 'src/services/api/admin-sessions.service';
import type {
  AdminSession,
  AdminSessionListParams,
  AdminSessionStatus,
} from 'src/types/admin-sessions';

export interface UseAdminSessionsPaginationOptions {
  initialParams: Omit<AdminSessionListParams, 'cursor'>;
  pageSize?: number;
  autoLoad?: boolean;
}

export interface UseAdminSessionsPaginationResult {
  sessions: AdminSession[];
  statusById: Record<string, AdminSessionStatus>;
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

function computeSessionStatus(session: AdminSession): AdminSessionStatus {
  if (session.revoked) {
    return 'revoked';
  }

  const now = dayjs();
  const expiredAt = dayjs(session.expired);

  if (expiredAt.isBefore(now)) {
    return 'expired';
  }

  return 'active';
}

export function useAdminSessionsPagination(
  options: UseAdminSessionsPaginationOptions,
): UseAdminSessionsPaginationResult {
  const {
    initialParams,
    pageSize: initialPageSize = 20,
    autoLoad = true,
  } = options;
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageCursors, setPageCursors] = useState<Map<number, string | null>>(
    new Map([[1, null]]),
  );
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const prevParamsRef = useRef<{
    created0?: string | null;
    created1?: string | null;
    userIds?: string[] | null;
  }>({});
  const hasLoadedOnceRef = useRef(false);

  const fetchPage = useCallback(
    async (page: number, cursor: string | null) => {
      setIsLoading(true);
      if (page === 1) {
        setIsInitialLoading(true);
      }

      try {
        const params: AdminSessionListParams = {
          ...initialParams,
          take: pageSize,
          cursor: cursor ?? undefined,
        };

        const result = await adminSessionsService.list(params);

        setSessions(result.docs);
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
    [initialParams, pageSize],
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
          const params: AdminSessionListParams = {
            ...initialParams,
            take: pageSize,
            cursor: targetCursor ?? undefined,
          };

          const result = await adminSessionsService.list(params);

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
            setSessions(result.docs);
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
    [currentPage, pageCursors, fetchPage, initialParams, pageSize],
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

  const statusById = useMemo(() => {
    const map: Record<string, AdminSessionStatus> = {};
    sessions.forEach((session) => {
      map[session.id] = computeSessionStatus(session);
    });
    return map;
  }, [sessions]);

  const total = useMemo(() => {
    const loadedCount = (currentPage - 1) * pageSize + sessions.length;
    return hasNext ? loadedCount + 1 : loadedCount;
  }, [currentPage, hasNext, pageSize, sessions.length]);

  useEffect(() => {
    if (!autoLoad) return;

    const prevParams = prevParamsRef.current;
    const currentParams = {
      created0: initialParams.created0,
      created1: initialParams.created1,
      userIds: initialParams.userIds,
    };

    const hasParamsChanged =
      prevParams.created0 !== currentParams.created0 ||
      prevParams.created1 !== currentParams.created1 ||
      JSON.stringify(prevParams.userIds) !==
        JSON.stringify(currentParams.userIds);

    if (!hasLoadedOnceRef.current || hasParamsChanged) {
      prevParamsRef.current = currentParams;
      hasLoadedOnceRef.current = false;
      setPageCursors(new Map([[1, null]]));
      setCurrentPage(1);
      void fetchPage(1, null);
    }
  }, [
    autoLoad,
    initialParams.created0,
    initialParams.created1,
    initialParams.userIds,
    fetchPage,
  ]);

  return {
    sessions,
    statusById,
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
