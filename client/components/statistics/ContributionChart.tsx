import { useInvestmentContributionsDetailed } from '@client/hooks/queries/useInvestmentContributionsDetailed';
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

interface ContributionChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
  };
}

export const ContributionChart = ({ queryParams }: ContributionChartProps) => {
  const { data, isLoading, error } =
    useInvestmentContributionsDetailed(queryParams);

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
            {error
              ? 'Failed to load contribution data'
              : 'No contribution data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.stats.map((item) => ({
    date: item.date,
    deposits: item.deposits,
    withdrawals: Math.abs(item.withdrawals),
    net: item.net,
    cumulative: item.cumulative,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Contributions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Deposits
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(data.summary.totalDeposits)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Withdrawals
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(data.summary.totalWithdrawals)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Net Contributions
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(data.summary.netContributions)}
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deposits vs Withdrawals
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorWithdrawals"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                dataKey="deposits"
                stackId="1"
                stroke="#10b981"
                fill="url(#colorDeposits)"
                name="Deposits"
              />
              <Area
                type="monotone"
                dataKey="withdrawals"
                stackId="1"
                stroke="#ef4444"
                fill="url(#colorWithdrawals)"
                name="Withdrawals"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cumulative Contributions
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="colorCumulative"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                dataKey="cumulative"
                stroke="#3b82f6"
                fill="url(#colorCumulative)"
                name="Cumulative"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
