import { apiClient } from 'src/lib/api/client';
import type {
  AdminAuditLogListQuery,
  AdminAuditLogListResponse,
} from 'src/types/admin-audit-logs';
import { createQueryKeys } from '../base.service';

// Unified controller prefix: /audit-logs (mounted under /api)
const AUDIT_LOG_BASE_PATH = '/api/audit-logs';

export const adminAuditLogKeys = {
  ...createQueryKeys('admin-audit-logs'),
  list: (filters?: Partial<AdminAuditLogListQuery>) =>
    [...createQueryKeys('admin-audit-logs').lists(), filters] as const,
};

export const adminAuditLogsService = {
  list(params?: AdminAuditLogListQuery): Promise<AdminAuditLogListResponse> {
    return apiClient.get<AdminAuditLogListResponse>(AUDIT_LOG_BASE_PATH, {
      params,
    });
  },

  resolve(id: string): Promise<void> {
    return apiClient.post<void>(`${AUDIT_LOG_BASE_PATH}/${id}/resolve`, {});
  },
};
