import { useQuery } from '@tanstack/react-query';
import {
  adminUserKeys,
  adminUsersService,
} from 'src/services/api/admin/users.service';
import type {
  AdminUserListQuery,
  AdminUserListResponse,
} from 'src/types/admin';

export function useAdminUsers(params?: AdminUserListQuery) {
  return useQuery<AdminUserListResponse>({
    queryKey: adminUserKeys.list(params),
    queryFn: () => adminUsersService.list(params),
  });
}
