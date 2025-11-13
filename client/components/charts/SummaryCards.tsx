import { useReportSummary } from '@client/hooks/queries/useReportSummary';
import { formatDecimal } from '@client/utils/format';
import { StatsGrid } from '../ui';

interface SummaryCardsProps {
  dateFrom?: string;
  dateTo?: string;
}

export const SummaryCards = ({ dateFrom, dateTo }: SummaryCardsProps) => {
  const { data, isLoading, error } = useReportSummary({ dateFrom, dateTo });

  const statsData = data && [
    {
      title: 'Total Balance',
      value: formatDecimal(data.totalBalance),
      diff: 0,
    },
    {
      title: 'Total Investments',
      value: formatDecimal(data.totalInvestments),
      diff: 0,
    },
    {
      title: 'Total Income',
      value: formatDecimal(data.totalIncome),
      diff: 0,
    },
    {
      title: 'Total Expense',
      value: formatDecimal(data.totalExpense),
      diff: 0,
    },
  ];

  return (
    <StatsGrid
      data={statsData}
      loading={isLoading}
      error={error}
      paperProps={{ p: 'xl' }}
    />
  );
};
