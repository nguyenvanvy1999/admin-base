import { useUserStatistics } from '@client/hooks/queries/useAdminStatistics';
import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface UserGrowthChartProps {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export const UserGrowthChart = ({
  dateFrom,
  dateTo,
  groupBy = 'month',
}: UserGrowthChartProps) => {
  const [currentGroupBy, setCurrentGroupBy] = useState<
    'day' | 'week' | 'month'
  >(groupBy);

  const { data, isLoading, error } = useUserStatistics({
    dateFrom,
    dateTo,
    groupBy: currentGroupBy,
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

  if (error || !data || data.userGrowthTimeSeries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ? 'Failed to load user growth data' : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.userGrowthTimeSeries.map((item) => ({
    date: item.date,
    totalUsers: item.count,
    newUsers: item.newUsers,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          User Growth
        </h3>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map((gb) => (
            <button
              key={gb}
              onClick={() => setCurrentGroupBy(gb)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentGroupBy === gb
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {gb.charAt(0).toUpperCase() + gb.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="newUsers"
            stroke="#10b981"
            fill="url(#colorNewUsers)"
            name="New Users"
          />
          <Line
            type="monotone"
            dataKey="totalUsers"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Total Users"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
