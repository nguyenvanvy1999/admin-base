import { useQuery } from '@tanstack/react-query';
import {
  type AdminRoleListQuery,
  adminRoleKeys,
  adminRolesService,
} from 'src/services/api/admin/roles.service';
import type {
  AdminRoleDetail,
  AdminRoleListResponse,
  UpsertRoleDto,
} from 'src/types/admin';
import { type MutationCallbacks, useAppMutation } from './useMutation';

export function useAdminRoles(params?: AdminRoleListQuery) {
  return useQuery<AdminRoleListResponse>({
    queryKey: adminRoleKeys.list(params),
    queryFn: () => adminRolesService.list(params),
  });
}

export function useAdminRoleDetail(id?: string | null) {
  return useQuery<AdminRoleDetail>({
    queryKey: adminRoleKeys.detail(id ?? 'new'),
    queryFn: () => {
      if (!id) {
        throw new Error('Role id is required');
      }
      return adminRolesService.detail(id);
    },
    enabled: !!id,
    refetchOnMount: 'always',
  });
}

export function useUpsertRole(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (data: UpsertRoleDto) => adminRolesService.upsert(data),
    invalidateKeys: [adminRoleKeys.lists(), adminRoleKeys.details()],
    successMessageKey: 'adminRolesPage.messages.upsertSuccess',
    successMessageDefault: 'Role saved successfully',
    errorMessageKey: 'adminRolesPage.messages.upsertError',
    errorMessageDefault: 'Failed to save role',
    ...options,
  });
}

export function useDeleteRoles(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (ids: string[]) => adminRolesService.delete(ids),
    invalidateKeys: [adminRoleKeys.lists()],
    successMessageKey: 'adminRolesPage.messages.deleteSuccess',
    successMessageDefault: 'Roles deleted successfully',
    errorMessageKey: 'adminRolesPage.messages.deleteError',
    errorMessageDefault: 'Failed to delete roles',
    ...options,
  });
}
