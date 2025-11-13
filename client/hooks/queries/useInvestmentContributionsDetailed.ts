import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useInvestmentContributionsDetailed = (query?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  investmentId?: string;
}) => {
  return useQuery({
    queryKey: ['report-investment-contributions-detailed', query],
    queryFn: () => reportService.getInvestmentContributionsDetailed(query),
  });
};
