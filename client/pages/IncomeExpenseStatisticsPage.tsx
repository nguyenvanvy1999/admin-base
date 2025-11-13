import { AccountBreakdownChart } from '@client/components/statistics/AccountBreakdownChart';
import { CategoryBreakdownChart } from '@client/components/statistics/CategoryBreakdownChart';
import { DateRangeFilter } from '@client/components/statistics/DateRangeFilter';
import { FeeStatistics } from '@client/components/statistics/FeeStatistics';
import { FilterBar } from '@client/components/statistics/FilterBar';
import { GroupBySelector } from '@client/components/statistics/GroupBySelector';
import { IncomeExpenseOverview } from '@client/components/statistics/IncomeExpenseOverview';
import { IncomeExpenseTable } from '@client/components/statistics/IncomeExpenseTable';
import { IncomeExpenseTimeChart } from '@client/components/statistics/IncomeExpenseTimeChart';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const IncomeExpenseStatisticsPage = () => {
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
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);

  const queryParams = {
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    groupBy,
    ...(categoryIds.length > 0 ? { categoryId: categoryIds[0] } : {}),
    ...(accountId ? { accountId } : {}),
    ...(entityId ? { entityId } : {}),
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('statistics.incomeExpense.title', {
              defaultValue: 'Income & Expense Statistics',
            })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('statistics.incomeExpense.description', {
              defaultValue: 'Detailed analysis of your income and expenses',
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
          </div>
          <FilterBar
            categoryIds={categoryIds}
            accountId={accountId || undefined}
            entityId={entityId || undefined}
            onCategoryChange={setCategoryIds}
            onAccountChange={setAccountId}
            onEntityChange={setEntityId}
          />
        </div>

        <div className="mb-8">
          <IncomeExpenseOverview queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <IncomeExpenseTimeChart queryParams={queryParams} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <CategoryBreakdownChart queryParams={queryParams} />
          <AccountBreakdownChart queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <FeeStatistics queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <IncomeExpenseTable queryParams={queryParams} />
        </div>
      </div>
    </div>
  );
};

export default IncomeExpenseStatisticsPage;
