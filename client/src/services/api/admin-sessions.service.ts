import { apiClient } from 'src/lib/api/client';
import type {
  AdminSessionListParams,
  AdminSessionPagingResponse,
} from 'src/types/admin-sessions';

const ADMIN_SESSION_BASE_PATH = '/api/admin/sessions';

export const adminSessionsService = {
  list(params: AdminSessionListParams): Promise<AdminSessionPagingResponse> {
    return apiClient.get<AdminSessionPagingResponse>(ADMIN_SESSION_BASE_PATH, {
      params,
    });
  },

  revoke(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${ADMIN_SESSION_BASE_PATH}/revoke`, {
      ids,
    });
  },
};
