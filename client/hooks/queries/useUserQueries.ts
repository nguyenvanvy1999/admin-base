import { userService } from '@client/services';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  search: z.string().optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListUsersQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'username' | 'name' | 'role' | 'created';
  sortOrder?: 'asc' | 'desc';
};

export const useUsersQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'username' | 'name' | 'role' | 'created';
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
  }),
});
