import { entityService } from '@client/services';
import { EntityType } from '@server/generated';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  search: z.string().optional(),
  type: z.array(z.enum(EntityType)).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListEntitiesQuery = {
  type?: EntityType[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'created';
  sortOrder?: 'asc' | 'desc';
};

export const useEntitiesQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'type' | 'created';
    sortOrder?: 'asc' | 'desc';
  },
  ListEntitiesQuery,
  any
>({
  queryKey: 'entities',
  serviceMethod: (query) => entityService.listEntities(query),
  filterTransformer: (criteria, query) => ({
    ...query,
    search: criteria.search?.trim() || undefined,
    type:
      criteria.type && criteria.type.length > 0
        ? (criteria.type as EntityType[])
        : undefined,
  }),
});

export const useEntitiesOptionsQuery = () => {
  return useQuery({
    queryKey: ['entities-options'],
    queryFn: () => {
      return entityService.listEntities({ limit: 1000 });
    },
  });
};
