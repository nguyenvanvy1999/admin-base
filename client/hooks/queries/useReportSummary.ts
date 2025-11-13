import { reportService } from '@client/services';
import { useQuery } from '@tanstack/react-query';

export const useReportSummary = (query?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  return useQuery({
    queryKey: ['report-summary', query],
    queryFn: () => reportService.getSummary(query),
  });
};
