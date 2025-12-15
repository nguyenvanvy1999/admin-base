import { useQuery } from '@tanstack/react-query';
import {
  type AdminPermissionListQuery,
  adminPermissionKeys,
  adminPermissionsService,
} from 'src/services/api/admin/roles.service';
import type { AdminPermission } from 'src/types/admin';

export function useAdminPermissions(params?: AdminPermissionListQuery) {
  return useQuery<AdminPermission[]>({
    queryKey: adminPermissionKeys.list(params),
    queryFn: () => adminPermissionsService.list(params),
  });
}
