import { useIncomeExpenseDetailed } from '@client/hooks/queries/useIncomeExpenseDetailed';
import { formatDecimal } from '@client/utils/format';
import { BarChart } from '@mantine/charts';

interface AccountBreakdownChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    categoryId?: string;
    accountId?: string;
    entityId?: string;
  };
}

export const AccountBreakdownChart = ({
  queryParams,
}: AccountBreakdownChartProps) => {
  const { data, isLoading, error } = useIncomeExpenseDetailed(queryParams);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || !data || data.accountStats.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ? 'Failed to load chart data' : 'No account data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.accountStats.map((acc) => ({
    name: acc.accountName,
    income: acc.income,
    expense: Math.abs(acc.expense),
    net: acc.net,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Account Breakdown
      </h3>
      <BarChart
        h={400}
        data={chartData}
        dataKey="name"
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
        withLegend
        xAxisProps={{
          angle: -45,
          textAnchor: 'end',
          height: 100,
        }}
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
