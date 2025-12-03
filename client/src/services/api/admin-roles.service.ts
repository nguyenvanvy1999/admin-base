import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';
import type {
  AdminRole,
  AdminRoleDetail,
  UpsertRoleDto,
} from 'src/types/admin-roles';

const ADMIN_ROLE_BASE_PATH = '/api/admin/roles';

export const adminRoleKeys = {
  ...createQueryKeys('admin-roles'),
  list: (filters?: Partial<AdminRoleListQuery>) =>
    [...createQueryKeys('admin-roles').lists(), filters] as const,
  detail: (id: string) =>
    [...createQueryKeys('admin-roles').details(), id] as const,
};

export interface AdminRoleListQuery {
  userId?: string;
  search?: string;

  [key: string]: unknown;
}

export const adminRolesService = {
  list(params?: AdminRoleListQuery): Promise<AdminRole[]> {
    return apiClient.get<AdminRole[]>(ADMIN_ROLE_BASE_PATH, {
      params,
    });
  },

  detail(id: string): Promise<AdminRoleDetail> {
    return apiClient.get<AdminRoleDetail>(`${ADMIN_ROLE_BASE_PATH}/${id}`);
  },

  upsert(data: UpsertRoleDto): Promise<void> {
    return apiClient.post<void>(ADMIN_ROLE_BASE_PATH, data);
  },

  delete(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${ADMIN_ROLE_BASE_PATH}/del`, { ids });
  },
};
