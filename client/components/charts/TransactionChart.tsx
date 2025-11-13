import { useReportTransactions } from '@client/hooks/queries/useReportTransactions';
import { formatDecimal } from '@client/utils/format';
import { AreaChart } from '@mantine/charts';

interface TransactionChartProps {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export const TransactionChart = ({
  dateFrom,
  dateTo,
  groupBy = 'month',
}: TransactionChartProps) => {
  const { data, isLoading, error } = useReportTransactions({
    dateFrom,
    dateTo,
    groupBy,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || !data || data.stats.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ? 'Failed to load transaction data' : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.stats.map((item) => ({
    date: item.date,
    income: item.income,
    expense: Math.abs(item.expense),
    net: item.net,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Transaction Overview
      </h3>
      <AreaChart
        h={300}
        data={chartData}
        dataKey="date"
        series={[
          {
            name: 'income',
            label: 'Income',
            color: '#10b981',
          },
          {
            name: 'expense',
            label: 'Expense',
            color: '#ef4444',
          },
        ]}
        curveType="natural"
        withLegend
        withGradient
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
