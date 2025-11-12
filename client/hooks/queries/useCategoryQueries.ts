import { get } from '@client/libs/http';
import type { CategoryFull } from '@client/types/category';
import type { CategoryListResponse } from '@server/dto/category.dto';
import type { CategoryType } from '@server/generated/prisma/enums';
import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

type ListCategoriesQuery = {
  type?: CategoryType[];
  includeDeleted?: boolean;
};

export const useCategoriesQuery = (
  query: ListCategoriesQuery = {},
  options?: Omit<
    UseQueryOptions<{ categories: CategoryFull[] }, Error>,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery({
    queryKey: ['categories', query],
    queryFn: async () => {
      const data = await get<CategoryListResponse>('/api/categories', {
        query,
      });

      return {
        categories: data.categories as CategoryFull[],
      };
    },
    ...options,
  });
};
