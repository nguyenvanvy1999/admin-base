import { DateRangePicker } from '@client/components';
import { InvestmentAllocationChart } from '@client/components/charts/InvestmentAllocationChart';
import { InvestmentPerformanceChart } from '@client/components/charts/InvestmentPerformanceChart';
import { SummaryCards } from '@client/components/charts/SummaryCards';
import { TransactionChart } from '@client/components/charts/TransactionChart';
import { AdminSummaryCards } from '@client/components/statistics/AdminSummaryCards';
import { UserGrowthChart } from '@client/components/statistics/UserGrowthChart';
import { UserRoleDistributionChart } from '@client/components/statistics/UserRoleDistributionChart';
import useUserStore from '@client/store/user';
import { Box } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useUserStore();

  const [dateRange, setDateRange] = useState<{
    from: string | null;
    to: string | null;
  }>({
    from: dayjs().subtract(3, 'month').startOf('month').toISOString(),
    to: dayjs().endOf('month').toISOString(),
  });

  const adminUser = isAdmin();

  if (adminUser) {
    return (
      <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Overview of user and session statistics
            </p>
          </div>

          <Box className="mb-6">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              mode="date"
              label={t('common.dateRange', { defaultValue: 'Date Range' })}
            />
          </Box>

          <div className="mb-8">
            <AdminSummaryCards />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="lg:col-span-2">
              <UserGrowthChart
                dateFrom={dateRange.from || ''}
                dateTo={dateRange.to || ''}
              />
            </div>
            <UserRoleDistributionChart />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('home.welcomeBack', { username: user?.username })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('home.successfullyLogged')}
          </p>
        </div>

        <Box className="mb-6">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            mode="date"
            label={t('common.dateRange', { defaultValue: 'Date Range' })}
          />
        </Box>

        <div className="mb-8">
          <SummaryCards
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
          />
        </div>

        <div className="mb-8">
          <TransactionChart
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
            groupBy="month"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <InvestmentAllocationChart
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
          />
          <InvestmentPerformanceChart
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
