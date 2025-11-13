import { Select } from '@client/components/Select';
import { DateRangeFilter } from '@client/components/statistics/DateRangeFilter';
import { DebtOverview } from '@client/components/statistics/DebtOverview';
import { DebtTimeChart } from '@client/components/statistics/DebtTimeChart';
import { EntityDebtsTable } from '@client/components/statistics/EntityDebtsTable';
import { GroupBySelector } from '@client/components/statistics/GroupBySelector';
import { LoanHistoryTable } from '@client/components/statistics/LoanHistoryTable';
import { useEntitiesOptionsQuery } from '@client/hooks/queries/useEntityQueries';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const DebtStatisticsPage = () => {
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
  const [entityId, setEntityId] = useState<string | null>(null);

  const { data: entitiesData } = useEntitiesOptionsQuery();
  const entities = entitiesData?.entities || [];

  const entityOptions = entities.map((entity) => ({
    value: entity.id,
    label: entity.name,
  }));

  const queryParams = {
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    groupBy,
    ...(entityId ? { entityId } : {}),
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('statistics.debt.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('statistics.debt.description')}
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
                {t('statistics.debt.filterByEntity')}
              </label>
              <Select
                items={entityOptions}
                value={entityId || null}
                onChange={(value) => setEntityId(value)}
                placeholder={t('statistics.debt.selectEntity')}
                searchable
                clearable
              />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <DebtOverview queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <DebtTimeChart queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <EntityDebtsTable queryParams={queryParams} />
        </div>

        <div className="mb-8">
          <LoanHistoryTable queryParams={queryParams} />
        </div>
      </div>
    </div>
  );
};

export default DebtStatisticsPage;
