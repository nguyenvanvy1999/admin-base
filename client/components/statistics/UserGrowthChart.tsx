import { useUserStatistics } from '@client/hooks/queries/useAdminStatistics';
import { CompositeChart } from '@mantine/charts';
import { useState } from 'react';

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
      <CompositeChart
        h={300}
        data={chartData}
        dataKey="date"
        series={[
          {
            name: 'newUsers',
            label: 'New Users',
            color: '#10b981',
            type: 'area',
          },
          {
            name: 'totalUsers',
            label: 'Total Users',
            color: '#3b82f6',
            type: 'line',
          },
        ]}
        curveType="natural"
        withLegend
        withDots={false}
      />
    </div>
  );
};
