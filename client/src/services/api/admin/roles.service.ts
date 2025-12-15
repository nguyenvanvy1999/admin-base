import { apiClient } from 'src/lib/api/client';
import type {
  AdminPermission,
  AdminRole,
  AdminRoleDetail,
  AdminRoleListResponse,
  UpsertRoleDto,
} from 'src/types/admin';
import { createAdminService } from './createAdminService';

const ADMIN_ROLE_BASE_PATH = '/api/admin/roles';
const ADMIN_PERMISSION_BASE_PATH = '/api/admin/permissions';

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

const { queryKeys: adminRoleKeys, service: baseRoleService } =
  createAdminService<
    AdminRoleListQuery,
    AdminRoleDetail,
    AdminRoleListResponse,
    UpsertRoleDto,
    UpsertRoleDto
  >({
    basePath: ADMIN_ROLE_BASE_PATH,
    queryKey: 'admin-roles',
    list: async (
      params?: AdminRoleListQuery,
    ): Promise<AdminRoleListResponse> => {
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
    create: (data: UpsertRoleDto): Promise<void> => {
      return apiClient.post<void>(ADMIN_ROLE_BASE_PATH, data);
    },
  });

export { adminRoleKeys };

export const adminRolesService = {
  list: baseRoleService.list,
  detail: baseRoleService.detail,
  upsert: baseRoleService.create,
  delete: baseRoleService.delete,
};

export const adminPermissionKeys = {
  ...createAdminService<
    AdminPermissionListQuery,
    AdminPermission,
    { docs: AdminPermission[]; count: number },
    never,
    never
  >({
    basePath: ADMIN_PERMISSION_BASE_PATH,
    queryKey: 'admin-permissions',
  }).queryKeys,
};

export const adminPermissionsService = {
  list(params?: AdminPermissionListQuery): Promise<AdminPermission[]> {
    return apiClient.get<AdminPermission[]>(ADMIN_PERMISSION_BASE_PATH, {
      params,
    });
  },
};
