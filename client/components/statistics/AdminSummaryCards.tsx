import {
  useSessionStatistics,
  useUserStatistics,
} from '@client/hooks/queries/useAdminStatistics';
import {
  IconCalendarWeek,
  IconDatabase,
  IconShieldCheck,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';

export const AdminSummaryCards = () => {
  const {
    data: userStats,
    isLoading: userLoading,
    error: userError,
  } = useUserStatistics();
  const {
    data: sessionStats,
    isLoading: sessionLoading,
    error: sessionError,
  } = useSessionStatistics();

  const isLoading = userLoading || sessionLoading;
  const error = userError || sessionError;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !userStats || !sessionStats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">
          Failed to load admin statistics
        </p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Users',
      value: userStats.totalUsers,
      icon: IconUsers,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'New Users This Month',
      value: userStats.newUsersThisMonth,
      icon: IconUserPlus,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'New Users This Week',
      value: userStats.newUsersThisWeek,
      icon: IconCalendarWeek,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    },
    {
      title: 'Active Sessions',
      value: sessionStats.activeSessions,
      icon: IconShieldCheck,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'Total Sessions',
      value: sessionStats.totalSessions,
      icon: IconDatabase,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </h3>
              <div className={`${card.bgColor} ${card.color} p-2 rounded-lg`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {card.value.toLocaleString()}
            </p>
          </div>
        );
      })}
    </div>
  );
};
