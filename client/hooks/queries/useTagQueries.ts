import { api } from '@client/libs/api';
import type { TagFull } from '@client/types/tag';
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
      const response = await api.api.tags.get({
        query: query,
      });

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch tags',
        );
      }

      const data = response.data;

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
