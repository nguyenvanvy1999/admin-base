import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import { handleApiError } from 'src/lib/api/errorHandler';
import { adminSessionsService } from 'src/services/api/admin-sessions.service';
import type {
  AdminSession,
  AdminSessionListParams,
  AdminSessionPagingResponse,
  AdminSessionStatus,
} from 'src/types/admin-sessions';

export interface UseAdminSessionsOptions {
  initialParams: Omit<AdminSessionListParams, 'cursor'>;
  autoLoad?: boolean;
}

export interface UseAdminSessionsResult {
  sessions: AdminSession[];
  statusById: Record<string, AdminSessionStatus>;
  paging: Pick<AdminSessionPagingResponse, 'hasNext' | 'nextCursor'>;
  isLoading: boolean;
  isInitialLoading: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
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

export function useAdminSessions(
  options: UseAdminSessionsOptions,
): UseAdminSessionsResult {
  const { initialParams, autoLoad = true } = options;
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [paging, setPaging] = useState<
    Pick<AdminSessionPagingResponse, 'hasNext' | 'nextCursor'>
  >({
    hasNext: false,
    nextCursor: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: string | null, append = false) => {
      setIsLoading(true);
      if (!append) {
        setIsInitialLoading(true);
      }

      try {
        const params: AdminSessionListParams = {
          ...initialParams,
          cursor: cursor ?? undefined,
        };

        const result = await adminSessionsService.list(params);

        setSessions((prev) =>
          append ? [...prev, ...result.docs] : result.docs,
        );

        setPaging({
          hasNext: result.hasNext,
          nextCursor: result.nextCursor,
        });
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    [initialParams],
  );

  const reload = useCallback(async () => {
    await fetchPage(null, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!paging.hasNext || !paging.nextCursor) return;
    await fetchPage(paging.nextCursor, true);
  }, [fetchPage, paging.hasNext, paging.nextCursor]);

  const statusById = useMemo(() => {
    const map: Record<string, AdminSessionStatus> = {};
    sessions.forEach((session) => {
      map[session.id] = computeSessionStatus(session);
    });
    return map;
  }, [sessions]);

  if (autoLoad && sessions.length === 0 && !isInitialLoading && !isLoading) {
    void reload();
  }

  return {
    sessions,
    statusById,
    paging,
    isLoading,
    isInitialLoading,
    reload,
    loadMore,
  };
}
