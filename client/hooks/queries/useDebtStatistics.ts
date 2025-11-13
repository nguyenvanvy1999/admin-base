import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useDebtStatistics = (query?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  entityId?: string;
}) => {
  return useQuery({
    queryKey: ['report-debt-statistics', query],
    queryFn: () => reportService.getDebtStatistics(query),
  });
};
