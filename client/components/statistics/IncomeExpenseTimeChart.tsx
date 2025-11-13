import { useIncomeExpenseDetailed } from '@client/hooks/queries/useIncomeExpenseDetailed';
import { formatDecimal } from '@client/utils/format';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface IncomeExpenseTimeChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    categoryId?: string;
    accountId?: string;
    entityId?: string;
  };
}

export const IncomeExpenseTimeChart = ({
  queryParams,
}: IncomeExpenseTimeChartProps) => {
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

  if (error || !data || data.timeStats.length === 0) {
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

  const chartData = data.timeStats.map((item) => ({
    date: item.date,
    income: item.income,
    expense: Math.abs(item.expense),
    net: item.net,
    fee: item.fee,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Income & Expense Over Time
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Legend />
          <Area
            type="monotone"
            dataKey="income"
            stackId="1"
            stroke="#10b981"
            fill="url(#colorIncome)"
            name="Income"
          />
          <Area
            type="monotone"
            dataKey="expense"
            stackId="1"
            stroke="#ef4444"
            fill="url(#colorExpense)"
            name="Expense"
          />
          <Area
            type="monotone"
            dataKey="fee"
            stroke="#f59e0b"
            fill="url(#colorFee)"
            name="Fee"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
