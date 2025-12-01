import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';
import type {
  AdminUserActionResponse,
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminUserMfaPayload,
  AdminUserUpdatePayload,
} from 'src/types/admin-users';

const ADMIN_USER_BASE_PATH = '/admin/users';

export const adminUserKeys = {
  ...createQueryKeys('admin-users'),
  list: (filters?: Partial<AdminUserListQuery>) =>
    [...createQueryKeys('admin-users').lists(), filters] as const,
  detail: (id: string) =>
    [...createQueryKeys('admin-users').details(), id] as const,
};

export const adminUsersService = {
  list(params?: AdminUserListQuery): Promise<AdminUserListResponse> {
    return apiClient.get<AdminUserListResponse>(ADMIN_USER_BASE_PATH, {
      params,
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
