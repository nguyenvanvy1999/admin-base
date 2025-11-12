import { categoryService } from '@client/services';
import type { CategoryFull } from '@client/types/category';
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
    queryFn: () => {
      return categoryService.listCategories(query);
    },
    ...options,
  });
};
