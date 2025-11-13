import {
  useSessionStatistics,
  useUserStatistics,
} from '@client/hooks/queries/useAdminStatistics';
import { StatsGrid } from '../ui';

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

  const statsData = userStats &&
    sessionStats && [
      {
        title: 'Total Users',
        value: userStats.totalUsers.toLocaleString(),
        diff: 0,
      },
      {
        title: 'New Users This Month',
        value: userStats.newUsersThisMonth.toLocaleString(),
        diff: 0,
      },
      {
        title: 'New Users This Week',
        value: userStats.newUsersThisWeek.toLocaleString(),
        diff: 0,
      },
      {
        title: 'Active Sessions',
        value: sessionStats.activeSessions.toLocaleString(),
        diff: 0,
      },
      {
        title: 'Total Sessions',
        value: sessionStats.totalSessions.toLocaleString(),
        diff: 0,
      },
    ];

  return (
    <StatsGrid
      data={statsData}
      loading={isLoading}
      error={error}
      paperProps={{ p: 'xl' }}
    />
  );
};
