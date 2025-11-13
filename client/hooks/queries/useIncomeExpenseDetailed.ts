import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useIncomeExpenseDetailed = (query?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  categoryId?: string;
  accountId?: string;
  entityId?: string;
}) => {
  return useQuery({
    queryKey: ['report-income-expense-detailed', query],
    queryFn: () => reportService.getIncomeExpenseDetailed(query),
  });
};
