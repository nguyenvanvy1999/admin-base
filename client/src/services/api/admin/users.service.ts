import { apiClient } from 'src/lib/api/client';
import type {
  AdminUserActionResponse,
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminUserMfaPayload,
  AdminUserUpdatePayload,
  AdminUserUpdateRolesPayload,
} from 'src/types/admin';
import { createQueryKeys } from '../base.service';

const ADMIN_USER_BASE_PATH = '/api/admin/users';

export const adminUserKeys = {
  ...createQueryKeys('admin-users'),
  list: (filters?: Partial<AdminUserListQuery>) =>
    [...createQueryKeys('admin-users').lists(), filters] as const,
  detail: (id: string) =>
    [...createQueryKeys('admin-users').details(), id] as const,
};

export const adminUsersService = {
  list(params?: AdminUserListQuery): Promise<AdminUserListResponse> {
    let normalizedParams:
      | Omit<AdminUserListQuery, 'roleIds' | 'statuses'>
      | undefined = params;

    if (params) {
      normalizedParams = {
        ...params,
        ...(params.roleIds?.length
          ? { roleIds: params.roleIds.join(',') }
          : { roleIds: undefined }),
        ...(params.statuses?.length
          ? { statuses: params.statuses.join(',') as unknown as never }
          : { statuses: undefined }),
      };
    }

    return apiClient.get<AdminUserListResponse>(ADMIN_USER_BASE_PATH, {
      params: normalizedParams,
    });
  },

  detail(userId: string): Promise<AdminUserDetail> {
    return apiClient.get<AdminUserDetail>(`${ADMIN_USER_BASE_PATH}/${userId}`);
  },

  create(payload: AdminUserCreatePayload): Promise<AdminUserActionResponse> {
    return apiClient.post<AdminUserActionResponse>(
      ADMIN_USER_BASE_PATH,
      payload,
    );
  },

  update(
    userId: string,
    payload: AdminUserUpdatePayload,
  ): Promise<AdminUserActionResponse> {
    return apiClient.patch<AdminUserActionResponse>(
      `${ADMIN_USER_BASE_PATH}/${userId}`,
      payload,
    );
  },

  updateRoles(
    userId: string,
    payload: AdminUserUpdateRolesPayload,
  ): Promise<AdminUserActionResponse> {
    return apiClient.patch<AdminUserActionResponse>(
      `${ADMIN_USER_BASE_PATH}/${userId}/roles`,
      payload,
    );
  },

  resetMfa(
    userId: string,
    payload: AdminUserMfaPayload,
  ): Promise<AdminUserActionResponse> {
    return apiClient.post<AdminUserActionResponse>(
      `${ADMIN_USER_BASE_PATH}/${userId}/mfa/reset`,
      payload,
    );
  },

  disableMfa(
    userId: string,
    payload: AdminUserMfaPayload,
  ): Promise<AdminUserActionResponse> {
    return apiClient.post<AdminUserActionResponse>(
      `${ADMIN_USER_BASE_PATH}/${userId}/mfa/disable`,
      payload,
    );
  },
};
