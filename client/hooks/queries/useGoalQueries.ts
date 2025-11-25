import { goalService } from '@client/services';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  search: z.string().optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListGoalsQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'amount' | 'startDate' | 'endDate' | 'created';
  sortOrder?: 'asc' | 'desc';
};

export const useGoalsQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'amount' | 'startDate' | 'endDate' | 'created';
    sortOrder?: 'asc' | 'desc';
  },
  ListGoalsQuery,
  any
>({
  queryKey: 'goals',
  serviceMethod: (query) =>
    goalService.listGoals({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortOrder: query.sortOrder ?? 'desc',
    }),
  filterTransformer: (criteria, query) => ({
    ...query,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    search: criteria.search?.trim() || undefined,
  }),
});

export const useGoalQuery = (goalId: string) => {
  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalService.getGoal(goalId),
    enabled: !!goalId,
  });
};

export const useGoalDetailQuery = (goalId: string) => {
  return useQuery({
    queryKey: ['goal-detail', goalId],
    queryFn: () => goalService.getGoalDetail(goalId),
    enabled: !!goalId,
  });
};
