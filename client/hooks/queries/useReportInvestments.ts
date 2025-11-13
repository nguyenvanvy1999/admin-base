import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useReportInvestments = (query?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  return useQuery({
    queryKey: ['report-investments', query],
    queryFn: () => reportService.getInvestments(query),
  });
};
