import { useQuery } from '@tanstack/react-query';
import {
  type AdminRoleListQuery,
  adminRoleKeys,
  adminRolesService,
} from 'src/services/api/admin-roles.service';
import type { AdminRole } from 'src/types/admin-roles';

export function useAdminRoles(params?: AdminRoleListQuery) {
  return useQuery<AdminRole[]>({
    queryKey: adminRoleKeys.list(params),
    queryFn: () => adminRolesService.list(params),
  });
}
