import { entityService } from '@client/services';
import type { EntityListResponse } from '@server/dto/entity.dto';
import type { EntityType } from '@server/generated/prisma/enums';
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
    queryFn: () => {
      return entityService.listEntities(query);
    },
  });
};
