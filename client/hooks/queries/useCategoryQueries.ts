import { api } from '@client/libs/api';
import type { CategoryFull } from '@client/types/category';
import type { CategoryType } from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';

type ListCategoriesQuery = {
  type?: CategoryType[];
  includeDeleted?: boolean;
};

export const useCategoriesQuery = (query: ListCategoriesQuery = {}) => {
  return useQuery({
    queryKey: ['categories', query],
    queryFn: async () => {
      const response = await api.api.categories.get({
        query: query,
      });

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch categories',
        );
      }

      const data = response.data;

      return {
        categories: data.categories as CategoryFull[],
      };
    },
  });
};
