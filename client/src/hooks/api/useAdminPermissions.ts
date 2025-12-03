import { useQuery } from '@tanstack/react-query';
import {
  type AdminPermissionListQuery,
  adminPermissionKeys,
  adminPermissionsService,
} from 'src/services/api/admin-permissions.service';
import type { AdminPermission } from 'src/types/admin-roles';

export function useAdminPermissions(params?: AdminPermissionListQuery) {
  return useQuery<AdminPermission[]>({
    queryKey: adminPermissionKeys.list(params),
    queryFn: () => adminPermissionsService.list(params),
  });
}
