import type { PermissionResponse } from '@client/services/PermissionService';
import { permissionService } from '@client/services/PermissionService';
import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

export const usePermissionsQuery = (
  options?: Omit<
    UseQueryOptions<PermissionResponse[], Error>,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery<PermissionResponse[]>({
    queryKey: ['admin-permissions'],
    queryFn: () => permissionService.listPermissions(),
    ...options,
  });
};
