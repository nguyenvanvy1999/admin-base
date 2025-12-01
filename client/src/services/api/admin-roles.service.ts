import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';
import type { AdminRole } from 'src/types/admin-roles';

const ADMIN_ROLE_BASE_PATH = '/admin/roles';

export const adminRoleKeys = createQueryKeys('admin-roles');

export interface AdminRoleListQuery {
  userId?: string;
}

export const adminRolesService = {
  list(params?: AdminRoleListQuery): Promise<AdminRole[]> {
    return apiClient.get<AdminRole[]>(ADMIN_ROLE_BASE_PATH, {
      params,
    });
  },
};
