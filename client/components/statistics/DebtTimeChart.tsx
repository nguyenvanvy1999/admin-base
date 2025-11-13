import { useDebtStatistics } from '@client/hooks/queries/useDebtStatistics';
import { formatDecimal } from '@client/utils/format';
import { LineChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';

interface DebtTimeChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    entityId?: string;
  };
}

export const DebtTimeChart = ({ queryParams }: DebtTimeChartProps) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useDebtStatistics(queryParams);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || !data || data.timeSeries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ? 'Failed to load chart data' : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.timeSeries.map((item) => ({
    date: item.date,
    loanGiven: item.totalLoanGiven,
    loanReceived: item.totalLoanReceived,
    netDebt: item.netDebt,
    cumulativeNetDebt: item.cumulativeNetDebt,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('statistics.debt.timeSeries')}
      </h3>
      <LineChart
        h={400}
        data={chartData}
        dataKey="date"
        series={[
          {
            name: 'loanGiven',
            label: t('statistics.debt.totalLoanGiven'),
            color: '#3b82f6',
          },
          {
            name: 'loanReceived',
            label: t('statistics.debt.totalLoanReceived'),
            color: '#10b981',
          },
          {
            name: 'cumulativeNetDebt',
            label: t('statistics.debt.netDebt'),
            color: '#ef4444',
          },
        ]}
        curveType="natural"
        withLegend
        withDots={false}
        yAxisProps={{
          tickFormatter: (value) => formatDecimal(value, 0),
        }}
        tooltipProps={{
          formatter: (value) => formatDecimal(value as number),
        }}
      />
    </div>
  );
};
