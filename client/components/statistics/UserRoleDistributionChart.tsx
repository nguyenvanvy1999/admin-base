import { useUserStatistics } from '@client/hooks/queries/useAdminStatistics';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981'];

export const UserRoleDistributionChart = () => {
  const { data, isLoading, error } = useUserStatistics();

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
              ? 'Failed to load user role data'
              : 'No user role data available'}
          </p>
        </div>
      </div>
    );
  }

  const totalUsers = data.usersByRole.admin + data.usersByRole.user;
  const chartData = [
    {
      name: 'Admin',
      value: data.usersByRole.admin,
      percentage:
        totalUsers > 0 ? (data.usersByRole.admin / totalUsers) * 100 : 0,
    },
    {
      name: 'User',
      value: data.usersByRole.user,
      percentage:
        totalUsers > 0 ? (data.usersByRole.user / totalUsers) * 100 : 0,
    },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        User Role Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ payload }) => `${payload.percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value.toLocaleString()} (${props.payload.percentage.toFixed(2)}%)`,
              name,
            ]}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          <Legend
            formatter={(value, entry: any) =>
              `${value}: ${entry.payload.value.toLocaleString()} (${entry.payload.percentage.toFixed(1)}%)`
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
