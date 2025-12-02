import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AdminRoleListQuery,
  adminRoleKeys,
  adminRolesService,
} from 'src/services/api/admin-roles.service';
import type {
  AdminRole,
  AdminRoleDetail,
  UpsertRoleDto,
} from 'src/types/admin-roles';

export function useAdminRoles(params?: AdminRoleListQuery) {
  return useQuery<AdminRole[]>({
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
  });
}

export function useUpsertRole(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertRoleDto) => adminRolesService.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRoleKeys.lists() });
      options?.onSuccess?.();
    },
  });
}

export function useDeleteRoles(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => adminRolesService.delete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRoleKeys.lists() });
      options?.onSuccess?.();
    },
  });
}
