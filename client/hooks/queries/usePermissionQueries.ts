import type { PermissionResponse } from '@client/services/PermissionService';
import { permissionService } from '@client/services/PermissionService';
import { useQuery } from '@tanstack/react-query';

export const usePermissionsQuery = () => {
  return useQuery<PermissionResponse[]>({
    queryKey: ['admin-permissions'],
    queryFn: () => permissionService.listPermissions(),
  });
};
