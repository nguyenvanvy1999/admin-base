import { tagService } from '@client/services';
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
    queryFn: () => {
      return tagService.listTags(query);
    },
  });
};
