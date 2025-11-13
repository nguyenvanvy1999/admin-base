import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useInvestmentFeesDetailed = (query?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  investmentId?: string;
}) => {
  return useQuery({
    queryKey: ['report-investment-fees-detailed', query],
    queryFn: () => reportService.getInvestmentFeesDetailed(query),
  });
};
