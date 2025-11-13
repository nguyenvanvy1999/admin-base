import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useReportTransactions = (query?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
}) => {
  return useQuery({
    queryKey: ['report-transactions', query],
    queryFn: () => reportService.getTransactions(query),
  });
};
