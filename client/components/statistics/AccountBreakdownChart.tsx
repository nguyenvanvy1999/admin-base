import { useIncomeExpenseDetailed } from '@client/hooks/queries/useIncomeExpenseDetailed';
import { formatDecimal } from '@client/utils/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-300 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="name"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
            tickFormatter={(value) => formatDecimal(value, 0)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => formatDecimal(value)}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Income" />
          <Bar dataKey="expense" fill="#ef4444" name="Expense" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
