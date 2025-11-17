import { roleService } from '@client/services/RoleService';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  search: z.string().optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListRolesQuery = {
  search?: string;
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'created';
  sortOrder?: 'asc' | 'desc';
};

export const useRolesQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'title' | 'created';
    sortOrder?: 'asc' | 'desc';
  },
  ListRolesQuery,
  any
>({
  queryKey: 'admin-roles',
  serviceMethod: (query) => roleService.listRoles(query),
  filterTransformer: (criteria, query) => ({
    ...query,
    search: criteria.search?.trim() || undefined,
  }),
});
