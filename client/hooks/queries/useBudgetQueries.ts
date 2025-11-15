import { budgetService } from '@client/services';
import { BudgetPeriod } from '@server/generated/browser-index';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  search: z.string().optional(),
  period: z.array(z.nativeEnum(BudgetPeriod)).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListBudgetsQuery = {
  search?: string;
  period?: BudgetPeriod[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'amount' | 'period' | 'startDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export const useBudgetsQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'amount' | 'period' | 'startDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  },
  ListBudgetsQuery,
  any
>({
  queryKey: 'budgets',
  serviceMethod: (query) => budgetService.listBudgets(query),
  filterTransformer: (criteria, query) => ({
    ...query,
    search: criteria.search?.trim() || undefined,
    period:
      criteria.period && criteria.period.length > 0
        ? criteria.period
        : undefined,
  }),
});

export const useBudgetQuery = (budgetId: string) => {
  return useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => budgetService.getBudget(budgetId),
    enabled: !!budgetId,
  });
};

export const useBudgetPeriodsQuery = (
  budgetId: string,
  query?: { startDate?: string; endDate?: string },
) => {
  return useQuery({
    queryKey: ['budget-periods', budgetId, query],
    queryFn: () => budgetService.getBudgetPeriods(budgetId, query),
    enabled: !!budgetId,
  });
};

export const useBudgetPeriodDetailQuery = (
  budgetId: string,
  periodId: string,
) => {
  return useQuery({
    queryKey: ['budget-period-detail', budgetId, periodId],
    queryFn: () => budgetService.getBudgetPeriodDetail(budgetId, periodId),
    enabled: !!budgetId && !!periodId,
  });
};
