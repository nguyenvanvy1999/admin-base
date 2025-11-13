import { userService } from '@client/services';
import { UserRole } from '@server/generated/prisma/enums';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  search: z.string().optional(),
  role: z.array(z.enum([UserRole.user, UserRole.admin])).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListUsersQuery = {
  search?: string;
  role?: UserRole[];
  page?: number;
  limit?: number;
  sortBy?: 'username' | 'name' | 'role' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export const useUsersQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'username' | 'name' | 'role' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  },
  ListUsersQuery,
  any
>({
  queryKey: 'admin-users',
  serviceMethod: (query) => userService.listUsers(query),
  filterTransformer: (criteria, query) => ({
    ...query,
    search: criteria.search?.trim() || undefined,
    role:
      criteria.role && criteria.role.length > 0
        ? (criteria.role as UserRole[])
        : undefined,
  }),
});
