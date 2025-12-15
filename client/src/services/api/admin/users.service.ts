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
import { createAdminService } from './createAdminService';

const ADMIN_USER_BASE_PATH = '/api/admin/users';

const { queryKeys: adminUserKeys, service: baseService } = createAdminService<
  AdminUserListQuery,
  AdminUserDetail,
  AdminUserListResponse,
  AdminUserCreatePayload,
  AdminUserUpdatePayload
>({
  basePath: ADMIN_USER_BASE_PATH,
  queryKey: 'admin-users',
  list: (params?: AdminUserListQuery): Promise<AdminUserListResponse> => {
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
  create: (payload: AdminUserCreatePayload): Promise<void> => {
    return apiClient.post<AdminUserActionResponse>(
      ADMIN_USER_BASE_PATH,
      payload,
    ) as unknown as Promise<void>;
  },
  update: (id: string, payload: AdminUserUpdatePayload): Promise<void> => {
    return apiClient.patch<AdminUserActionResponse>(
      `${ADMIN_USER_BASE_PATH}/${id}`,
      payload,
    ) as unknown as Promise<void>;
  },
});

export { adminUserKeys };

export const adminUsersService = {
  list: baseService.list,
  detail: baseService.detail,
  create: baseService.create,
  update: baseService.update,
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
