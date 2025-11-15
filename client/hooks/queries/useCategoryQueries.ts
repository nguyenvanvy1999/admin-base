import { categoryService } from '@client/services';
import type { CategoryTreeResponse } from '@server/dto/category.dto';
import type { CategoryType } from '@server/generated';
import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

type ListCategoriesQuery = {
  type?: CategoryType[];
  includeDeleted?: boolean;
};

export const useCategoriesQuery = (
  query: ListCategoriesQuery = {},
  options?: Omit<
    UseQueryOptions<{ categories: CategoryTreeResponse[] }, Error>,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery({
    queryKey: ['categories', query],
    queryFn: () => {
      return categoryService.listCategories(query);
    },
    ...options,
  });
};
