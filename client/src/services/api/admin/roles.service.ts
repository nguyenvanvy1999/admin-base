import { apiClient } from 'src/lib/api/client';
import type {
  AdminPermission,
  AdminRole,
  AdminRoleDetail,
  AdminRoleListResponse,
  UpsertRoleDto,
} from 'src/types/admin';
import { createQueryKeys } from '../base.service';

const ADMIN_ROLE_BASE_PATH = '/api/admin/roles';
const ADMIN_PERMISSION_BASE_PATH = '/api/admin/permissions';

export const adminRoleKeys = {
  ...createQueryKeys('admin-roles'),
  list: (filters?: Partial<AdminRoleListQuery>) =>
    [...createQueryKeys('admin-roles').lists(), filters] as const,
  detail: (id: string) =>
    [...createQueryKeys('admin-roles').details(), id] as const,
};

export const adminPermissionKeys = {
  ...createQueryKeys('admin-permissions'),
  list: (filters?: Partial<AdminPermissionListQuery>) =>
    [...createQueryKeys('admin-permissions').lists(), filters] as const,
};

export interface AdminPermissionListQuery {
  roleId?: string;

  [key: string]: unknown;
}

export interface AdminRoleListQuery {
  skip?: number;
  take?: number;
  userId?: string;
  search?: string;

  [key: string]: unknown;
}

export const adminRolesService = {
  async list(params?: AdminRoleListQuery): Promise<AdminRoleListResponse> {
    const response = await apiClient.get<AdminRole[] | AdminRoleListResponse>(
      ADMIN_ROLE_BASE_PATH,
      {
        params,
      },
    );

    if (Array.isArray(response)) {
      return {
        docs: response,
        count: response.length,
      };
    }

    return response;
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

export const adminPermissionsService = {
  list(params?: AdminPermissionListQuery): Promise<AdminPermission[]> {
    return apiClient.get<AdminPermission[]>(ADMIN_PERMISSION_BASE_PATH, {
      params,
    });
  },
};
