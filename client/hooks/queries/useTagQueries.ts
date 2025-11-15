import { tagService } from '@client/services';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  search: z.string().optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListTagsQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'created';
  sortOrder?: 'asc' | 'desc';
};

export const useTagsQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'created';
    sortOrder?: 'asc' | 'desc';
  },
  ListTagsQuery,
  any
>({
  queryKey: 'tags',
  serviceMethod: (query) => tagService.listTags(query),
  filterTransformer: (criteria, query) => ({
    ...query,
    search: criteria.search?.trim() || undefined,
  }),
});
