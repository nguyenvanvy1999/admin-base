import { api } from '@client/libs/api';
import type { EntityFull } from '@client/types/entity';
import { useQuery } from '@tanstack/react-query';

type ListEntitiesQuery = {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export const useEntitiesQuery = (query: ListEntitiesQuery = {}) => {
  return useQuery({
    queryKey: ['entities', query],
    queryFn: async () => {
      const response = await api.api.entities.get({
        query: query,
      });

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch entities',
        );
      }

      const data = response.data;

      return {
        entities: data.entities.map((entity) => ({
          ...entity,
          createdAt:
            entity.createdAt instanceof Date
              ? entity.createdAt.toISOString()
              : entity.createdAt,
          updatedAt:
            entity.updatedAt instanceof Date
              ? entity.updatedAt.toISOString()
              : entity.updatedAt,
        })) satisfies EntityFull[],
        pagination: data.pagination,
      };
    },
  });
};
