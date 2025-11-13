import { useIncomeExpenseDetailed } from '@client/hooks/queries/useIncomeExpenseDetailed';
import { formatDecimal } from '@client/utils/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface FeeStatisticsProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    categoryId?: string;
    accountId?: string;
    entityId?: string;
  };
}

export const FeeStatistics = ({ queryParams }: FeeStatisticsProps) => {
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

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ? 'Failed to load fee data' : 'No fee data available'}
          </p>
        </div>
      </div>
    );
  }

  const { feeStats, timeStats } = data;

  const chartData = timeStats.map((item) => ({
    date: item.date,
    fee: item.fee,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Fee Statistics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Fee</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(feeStats.totalFee)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Average Fee per Transaction
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(feeStats.averageFeePerTransaction)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Transactions with Fees
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {feeStats.feeByCategory.length + feeStats.feeByAccount.length}
          </p>
        </div>
      </div>
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Fees Over Time
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-300 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fill: 'currentColor' }}
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
            <Bar dataKey="fee" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {feeStats.feeByCategory.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fees by Category
          </h4>
          <div className="space-y-2">
            {feeStats.feeByCategory.slice(0, 5).map((item) => (
              <div
                key={item.categoryId}
                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.categoryName}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDecimal(item.fee)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
