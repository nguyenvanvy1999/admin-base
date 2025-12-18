import { apiClient } from 'src/lib/api/client';
import type {
  UserAuditLogListQuery,
  UserAuditLogListResponse,
} from 'src/types/admin-audit-logs';
import { createQueryKeys } from './base.service';

const USER_AUDIT_LOG_BASE_PATH = '/api/audit-logs';

export const userAuditLogKeys = {
  ...createQueryKeys('user-audit-logs'),
  list: (filters?: Partial<UserAuditLogListQuery>) =>
    [...createQueryKeys('user-audit-logs').lists(), filters] as const,
};

export const userAuditLogsService = {
  list(params?: UserAuditLogListQuery): Promise<UserAuditLogListResponse> {
    return apiClient.get<UserAuditLogListResponse>(USER_AUDIT_LOG_BASE_PATH, {
      params,
    });
  },
};
