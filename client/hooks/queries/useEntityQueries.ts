import { get } from '@client/libs/http';
import type { EntityFull } from '@client/types/entity';
import type { EntityType } from '@server/generated/prisma/enums';
import type { EntityListResponse } from '@server/src/dto/entity.dto';
import { useQuery } from '@tanstack/react-query';

type ListEntitiesQuery = {
  type?: EntityType[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export const useEntitiesQuery = (query: ListEntitiesQuery = {}) => {
  return useQuery({
    queryKey: ['entities', query],
    queryFn: async () => {
      const data = await get<EntityListResponse>('/api/entities', {
        query,
      });

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
