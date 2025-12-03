import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';
import type {
  AdminRole,
  AdminRoleDetail,
  AdminRoleListResponse,
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
