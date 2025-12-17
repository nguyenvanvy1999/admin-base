import { useQuery } from '@tanstack/react-query';
import {
  type AdminUserListQuery,
  adminUserKeys,
  adminUsersService,
} from 'src/services/api/admin/users.service';
import type { AdminUserListResponse } from 'src/types/admin';

export function useAdminUsers(params?: AdminUserListQuery) {
  return useQuery<AdminUserListResponse>({
    queryKey: adminUserKeys.list(params),
    queryFn: () => adminUsersService.list(params),
  });
}
