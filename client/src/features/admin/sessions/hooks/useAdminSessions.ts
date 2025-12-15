import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useCursorPagination } from 'src/hooks/pagination';
import { adminSessionsService } from 'src/services/api/admin/sessions.service';
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

  const pagination = useCursorPagination<AdminSession, AdminSessionListParams>(
    async (params) => adminSessionsService.list(params),
    {
      initialParams,
      pageSize: initialPageSize,
      autoLoad,
      paramsComparator: (prev, current) => {
        return (
          prev.created0 !== current.created0 ||
          prev.created1 !== current.created1 ||
          prev.ip !== current.ip ||
          prev.revoked !== current.revoked ||
          JSON.stringify(prev.userIds) !== JSON.stringify(current.userIds)
        );
      },
    },
  );

  const statusById = useMemo(() => {
    const map: Record<string, AdminSessionStatus> = {};
    pagination.data.forEach((session) => {
      map[session.id] = computeSessionStatus(session);
    });
    return map;
  }, [pagination.data]);

  return {
    sessions: pagination.data,
    statusById,
    pagination: pagination.pagination,
    isLoading: pagination.isLoading,
    isInitialLoading: pagination.isInitialLoading,
    reload: pagination.reload,
    goToPage: pagination.goToPage,
    changePageSize: pagination.changePageSize,
  };
}
