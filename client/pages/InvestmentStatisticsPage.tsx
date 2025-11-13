import { Select } from '@client/components/Select';
import { ContributionChart } from '@client/components/statistics/ContributionChart';
import { DateRangeFilter } from '@client/components/statistics/DateRangeFilter';
import { GroupBySelector } from '@client/components/statistics/GroupBySelector';
import { InvestmentFeesChart } from '@client/components/statistics/InvestmentFeesChart';
import { InvestmentOverview } from '@client/components/statistics/InvestmentOverview';
import { InvestmentPerformanceChart } from '@client/components/statistics/InvestmentPerformanceChart';
import { InvestmentTable } from '@client/components/statistics/InvestmentTable';
import { TradeStatistics } from '@client/components/statistics/TradeStatistics';
import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const InvestmentStatisticsPage = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  }>({
    from: dayjs().subtract(3, 'month').startOf('month').toISOString(),
    to: dayjs().endOf('month').toISOString(),
  });

  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>(
    'month',
  );
  const [accountId, setAccountId] = useState<string | null>(null);
  const { data: accountsData } = useAccountsOptionsQuery();

  const accountOptions =
    accountsData?.accounts?.map((acc) => ({
      label: acc.name,
      value: acc.id,
    })) || [];

  const queryParams = {
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    groupBy,
    ...(accountId ? { accountId } : {}),
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('statistics.investment.title', {
              defaultValue: 'Investment Statistics',
            })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('statistics.investment.description', {
              defaultValue: 'Detailed analysis of your investments',
            })}
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <DateRangeFilter
            dateFrom={dateRange.from}
            dateTo={dateRange.to}
            onChange={(type, value) =>
              setDateRange((prev) => ({ ...prev, [type]: value }))
            }
          />
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <GroupBySelector value={groupBy} onChange={setGroupBy} />
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('statistics.filterByAccount', {
                  defaultValue: 'Filter by Account',
                })}
              </label>
              <Select
                items={accountOptions}
                value={accountId || null}
                onChange={(value) => setAccountId(value)}
                placeholder={t('statistics.selectAccount', {
                  defaultValue: 'Select account',
                })}
                searchable
                clearable
              />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <InvestmentOverview queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <InvestmentPerformanceChart queryParams={queryParams} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <TradeStatistics queryParams={queryParams} />
          <InvestmentFeesChart queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <ContributionChart queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <InvestmentTable queryParams={queryParams} />
        </div>
      </div>
    </div>
  );
};

export default InvestmentStatisticsPage;
