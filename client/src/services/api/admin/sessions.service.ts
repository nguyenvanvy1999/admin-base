import { apiClient } from 'src/lib/api/client';
import type {
  AdminSessionListParams,
  AdminSessionPagingResponse,
} from 'src/types/admin-sessions';
import { createQueryKeys } from '../base.service';

// Unified controller prefix: /sessions (mounted under /api)
const SESSION_BASE_PATH = '/api/sessions';

export const adminSessionKeys = {
  ...createQueryKeys('admin-sessions'),
  list: (filters?: Partial<AdminSessionListParams>) =>
    [...createQueryKeys('admin-sessions').lists(), filters] as const,
};

export const adminSessionsService = {
  list(params: AdminSessionListParams): Promise<AdminSessionPagingResponse> {
    const normalizedParams: Omit<AdminSessionListParams, 'userIds'> & {
      userIds?: string;
    } = {
      ...params,
      ...(params.userIds && params.userIds.length
        ? { userIds: params.userIds.join(',') }
        : { userIds: undefined }),
    };

    return apiClient.get<AdminSessionPagingResponse>(SESSION_BASE_PATH, {
      params: normalizedParams,
    });
  },

  revoke(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${SESSION_BASE_PATH}/revoke`, {
      ids,
    });
  },
};
