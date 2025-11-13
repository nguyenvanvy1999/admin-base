import { useInvestmentPerformanceDetailed } from '@client/hooks/queries/useInvestmentPerformanceDetailed';
import { formatDecimal } from '@client/utils/format';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface InvestmentPerformanceChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
    accountId?: string;
    assetType?: string;
  };
}

export const InvestmentPerformanceChart = ({
  queryParams,
}: InvestmentPerformanceChartProps) => {
  const { data, isLoading, error } =
    useInvestmentPerformanceDetailed(queryParams);

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
    totalInvested: item.totalInvested,
    totalValue: item.totalValue,
    realizedPnl: item.realizedPnl,
    unrealizedPnl: item.unrealizedPnl,
    totalPnl: item.totalPnl,
    roi: item.roi,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Investment Performance
      </h3>
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Portfolio Value Over Time
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
              <Line
                type="monotone"
                dataKey="totalInvested"
                stroke="#3b82f6"
                name="Total Invested"
              />
              <Line
                type="monotone"
                dataKey="totalValue"
                stroke="#10b981"
                name="Current Value"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            P&L Over Time
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorUnrealized"
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
                dataKey="realizedPnl"
                stackId="1"
                stroke="#10b981"
                fill="url(#colorRealized)"
                name="Realized P&L"
              />
              <Area
                type="monotone"
                dataKey="unrealizedPnl"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#colorUnrealized)"
                name="Unrealized P&L"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ROI Over Time
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `${formatDecimal(value)}%`}
                labelStyle={{ color: 'var(--color-text)' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="roi"
                stroke="#8b5cf6"
                name="ROI (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
