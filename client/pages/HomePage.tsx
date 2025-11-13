import { InvestmentAllocationChart } from '@client/components/charts/InvestmentAllocationChart';
import { InvestmentPerformanceChart } from '@client/components/charts/InvestmentPerformanceChart';
import { SummaryCards } from '@client/components/charts/SummaryCards';
import { TransactionChart } from '@client/components/charts/TransactionChart';
import useUserStore from '@client/store/user';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();

  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  }>({
    from: dayjs().subtract(3, 'month').startOf('month').toISOString(),
    to: dayjs().endOf('month').toISOString(),
  });

  const handleDateRangeChange = (type: 'from' | 'to', value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

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

        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Date Range Filter
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dayjs(dateRange.from).format('YYYY-MM-DD')}
                  onChange={(e) =>
                    handleDateRangeChange(
                      'from',
                      dayjs(e.target.value).toISOString(),
                    )
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dayjs(dateRange.to).format('YYYY-MM-DD')}
                  onChange={(e) =>
                    handleDateRangeChange(
                      'to',
                      dayjs(e.target.value).toISOString(),
                    )
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <SummaryCards dateFrom={dateRange.from} dateTo={dateRange.to} />
        </div>

        <div className="mb-8">
          <TransactionChart
            dateFrom={dateRange.from}
            dateTo={dateRange.to}
            groupBy="month"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <InvestmentAllocationChart
            dateFrom={dateRange.from}
            dateTo={dateRange.to}
          />
          <InvestmentPerformanceChart
            dateFrom={dateRange.from}
            dateTo={dateRange.to}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
