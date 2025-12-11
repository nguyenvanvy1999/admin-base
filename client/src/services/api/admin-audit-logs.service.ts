import { apiClient } from 'src/lib/api/client';
import type {
  AdminAuditLogListQuery,
  AdminAuditLogListResponse,
} from 'src/types/admin-audit-logs';

const ADMIN_AUDIT_LOG_BASE_PATH = '/api/admin/audit-logs';

export const adminAuditLogsService = {
  list(params?: AdminAuditLogListQuery): Promise<AdminAuditLogListResponse> {
    return apiClient.get<AdminAuditLogListResponse>(ADMIN_AUDIT_LOG_BASE_PATH, {
      params,
    });
  },
};
