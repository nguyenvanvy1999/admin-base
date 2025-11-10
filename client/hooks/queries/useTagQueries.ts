import { get } from '@client/libs/http';
import type { TagFull } from '@client/types/tag';
import type { TagListResponse } from '@server/src/dto/tag.dto';
import { useQuery } from '@tanstack/react-query';

type ListTagsQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export const useTagsQuery = (query: ListTagsQuery = {}) => {
  return useQuery({
    queryKey: ['tags', query],
    queryFn: async () => {
      const data = await get<TagListResponse>('/api/tags', {
        query,
      });

      return {
        tags: data.tags.map((tag) => ({
          ...tag,
          createdAt:
            tag.createdAt instanceof Date
              ? tag.createdAt.toISOString()
              : tag.createdAt,
          updatedAt:
            tag.updatedAt instanceof Date
              ? tag.updatedAt.toISOString()
              : tag.updatedAt,
        })) satisfies TagFull[],
        pagination: data.pagination,
      };
    },
  });
};
