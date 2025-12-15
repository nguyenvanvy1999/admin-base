import { apiClient } from 'src/lib/api/client';
import type {
  AdminAuditLogListQuery,
  AdminAuditLogListResponse,
} from 'src/types/admin-audit-logs';
import { createQueryKeys } from '../base.service';

const ADMIN_AUDIT_LOG_BASE_PATH = '/api/admin/audit-logs';

export const adminAuditLogKeys = {
  ...createQueryKeys('admin-audit-logs'),
  list: (filters?: Partial<AdminAuditLogListQuery>) =>
    [...createQueryKeys('admin-audit-logs').lists(), filters] as const,
};

export const adminAuditLogsService = {
  list(params?: AdminAuditLogListQuery): Promise<AdminAuditLogListResponse> {
    return apiClient.get<AdminAuditLogListResponse>(ADMIN_AUDIT_LOG_BASE_PATH, {
      params,
    });
  },
};
