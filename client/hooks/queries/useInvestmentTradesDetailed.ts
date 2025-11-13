import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useInvestmentTradesDetailed = (query?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  investmentId?: string;
  accountId?: string;
}) => {
  return useQuery({
    queryKey: ['report-investment-trades-detailed', query],
    queryFn: () => reportService.getInvestmentTradesDetailed(query),
  });
};
