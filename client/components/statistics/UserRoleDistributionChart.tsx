import { useUserStatistics } from '@client/hooks/queries/useAdminStatistics';
import { PieChart } from '@mantine/charts';

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

  const COLORS = ['#3b82f6', '#10b981'];

  const totalUsers = data.usersByRole.admin + data.usersByRole.user;
  const chartData = [
    {
      name: 'Admin',
      value: data.usersByRole.admin,
      percentage:
        totalUsers > 0 ? (data.usersByRole.admin / totalUsers) * 100 : 0,
      color: COLORS[0],
    },
    {
      name: 'User',
      value: data.usersByRole.user,
      percentage:
        totalUsers > 0 ? (data.usersByRole.user / totalUsers) * 100 : 0,
      color: COLORS[1],
    },
  ]
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
    }));

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
      <PieChart
        h={300}
        data={chartData}
        tooltipProps={{
          formatter: (value: unknown, payload: unknown) => [
            `${(value as number).toLocaleString()} (${(payload as { percentage: number }).percentage.toFixed(2)}%)`,
            (payload as { name: string }).name,
          ],
        }}
        withLabelsLine
        labelsType="percent"
      />
    </div>
  );
};
