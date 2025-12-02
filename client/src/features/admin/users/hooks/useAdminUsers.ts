import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminUserKeys,
  adminUsersService,
} from 'src/services/api/admin-users.service';
import type {
  AdminUserActionResponse,
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserMfaPayload,
  AdminUserUpdatePayload,
  AdminUserUpdateRolesPayload,
} from 'src/types/admin-users';

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

export function useCreateAdminUser(options?: {
  onSuccess?: (res: AdminUserActionResponse) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserCreatePayload) =>
      adminUsersService.create(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      options?.onSuccess?.(response);
    },
  });
}

export function useUpdateAdminUser(options?: {
  onSuccess?: (res: AdminUserActionResponse) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: AdminUserUpdatePayload;
    }) => adminUsersService.update(userId, payload),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminUserKeys.detail(variables.userId),
      });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      options?.onSuccess?.(response);
    },
  });
}

export function useUpdateAdminUserRoles(options?: {
  onSuccess?: (res: AdminUserActionResponse) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: AdminUserUpdateRolesPayload;
    }) => adminUsersService.updateRoles(userId, payload),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminUserKeys.detail(variables.userId),
      });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      options?.onSuccess?.(response);
    },
  });
}

export function useAdminUserMfaAction(
  action: 'reset' | 'disable',
  options?: {
    onSuccess?: (res: AdminUserActionResponse) => void;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
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
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminUserKeys.detail(variables.userId),
      });
      options?.onSuccess?.(response);
    },
  });
}
