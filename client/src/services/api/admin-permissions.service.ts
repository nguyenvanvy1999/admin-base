import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';
import type { AdminPermission } from 'src/types/admin-roles';

const ADMIN_PERMISSION_BASE_PATH = '/api/admin/permissions';

export const adminPermissionKeys = {
  ...createQueryKeys('admin-permissions'),
  list: (filters?: Partial<AdminPermissionListQuery>) =>
    [...createQueryKeys('admin-permissions').lists(), filters] as const,
};

export interface AdminPermissionListQuery {
  roleId?: string;
  [key: string]: unknown;
}

export const adminPermissionsService = {
  list(params?: AdminPermissionListQuery): Promise<AdminPermission[]> {
    return apiClient.get<AdminPermission[]>(ADMIN_PERMISSION_BASE_PATH, {
      params,
    });
  },
};
