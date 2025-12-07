import { useQuery } from '@tanstack/react-query';
import {
  type MutationCallbacks,
  useAppMutation,
} from 'src/hooks/api/useAppMutation';
import {
  adminUserKeys,
  adminUsersService,
} from '../services/admin-users.service';
import type {
  AdminUserActionResponse,
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserMfaPayload,
  AdminUserUpdatePayload,
  AdminUserUpdateRolesPayload,
} from '../types';

export function useAdminUserDetail(userId?: string, enabled = true) {
  return useQuery<AdminUserDetail>({
    queryKey: userId
      ? adminUserKeys.detail(userId)
      : adminUserKeys.detail('unknown'),
    queryFn: () => {
      if (!userId) {
        return Promise.reject(new Error('Missing user id'));
      }
      return adminUsersService.detail(userId);
    },
    enabled: Boolean(userId) && enabled,
  });
}

export function useCreateAdminUser(
  options?: MutationCallbacks<
    AdminUserActionResponse,
    Error,
    AdminUserCreatePayload
  >,
) {
  return useAppMutation({
    mutationFn: (payload: AdminUserCreatePayload) =>
      adminUsersService.create(payload),
    invalidateKeys: [adminUserKeys.lists()],
    successMessageKey: 'adminUsersPage.messages.createSuccess',
    successMessageDefault: 'User created successfully',
    errorMessageKey: 'adminUsersPage.messages.createError',
    errorMessageDefault: 'Failed to create user',
    ...options,
  });
}

export function useUpdateAdminUser(
  options?: MutationCallbacks<
    AdminUserActionResponse,
    Error,
    { userId: string; payload: AdminUserUpdatePayload }
  >,
) {
  return useAppMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: AdminUserUpdatePayload;
    }) => adminUsersService.update(userId, payload),
    invalidateKeys: (vars) => [
      adminUserKeys.detail(vars.userId),
      adminUserKeys.lists(),
    ],
    successMessageKey: 'adminUsersPage.messages.updateSuccess',
    successMessageDefault: 'User updated successfully',
    errorMessageKey: 'adminUsersPage.messages.updateError',
    errorMessageDefault: 'Failed to update user',
    ...options,
  });
}

export function useUpdateAdminUserRoles(
  options?: MutationCallbacks<
    AdminUserActionResponse,
    Error,
    { userId: string; payload: AdminUserUpdateRolesPayload }
  >,
) {
  return useAppMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: AdminUserUpdateRolesPayload;
    }) => adminUsersService.updateRoles(userId, payload),
    invalidateKeys: (vars) => [
      adminUserKeys.detail(vars.userId),
      adminUserKeys.lists(),
    ],
    successMessageKey: 'adminUsersPage.messages.updateRolesSuccess',
    successMessageDefault: 'User roles updated successfully',
    errorMessageKey: 'adminUsersPage.messages.updateRolesError',
    errorMessageDefault: 'Failed to update user roles',
    ...options,
  });
}

export function useAdminUserMfaAction(
  action: 'reset' | 'disable',
  options?: MutationCallbacks<
    AdminUserActionResponse,
    Error,
    { userId: string; payload: AdminUserMfaPayload }
  >,
) {
  return useAppMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: AdminUserMfaPayload;
    }) => {
      if (action === 'reset') {
        return adminUsersService.resetMfa(userId, payload);
      }
      return adminUsersService.disableMfa(userId, payload);
    },
    invalidateKeys: (vars) => [adminUserKeys.detail(vars.userId)],
    successMessageKey:
      action === 'reset'
        ? 'adminUsersPage.messages.resetMfaSuccess'
        : 'adminUsersPage.messages.disableMfaSuccess',
    successMessageDefault:
      action === 'reset'
        ? 'MFA reset successfully'
        : 'MFA disabled successfully',
    errorMessageKey:
      action === 'reset'
        ? 'adminUsersPage.messages.resetMfaError'
        : 'adminUsersPage.messages.disableMfaError',
    errorMessageDefault:
      action === 'reset' ? 'Failed to reset MFA' : 'Failed to disable MFA',
    ...options,
  });
}
