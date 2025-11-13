import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useInvestmentPerformanceDetailed = (query?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  investmentId?: string;
  accountId?: string;
  assetType?: string;
}) => {
  return useQuery({
    queryKey: ['report-investment-performance-detailed', query],
    queryFn: () => reportService.getInvestmentPerformanceDetailed(query),
  });
};
