import { PageContainer } from '@client/components/PageContainer';
import { PageHeader } from '@client/components/PageHeader';
import { Select } from '@client/components/Select';
import { DateRangeFilter } from '@client/components/statistics/DateRangeFilter';
import { DebtOverview } from '@client/components/statistics/DebtOverview';
import { DebtTimeChart } from '@client/components/statistics/DebtTimeChart';
import { EntityDebtsTable } from '@client/components/statistics/EntityDebtsTable';
import { GroupBySelector } from '@client/components/statistics/GroupBySelector';
import { LoanHistoryTable } from '@client/components/statistics/LoanHistoryTable';
import { useEntitiesOptionsQuery } from '@client/hooks/queries/useEntityQueries';
import { Group, Stack, Text } from '@mantine/core';
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
    <PageContainer>
      <Stack gap="xl">
        <PageHeader
          title={t('statistics.debt.title')}
          description={t('statistics.debt.description')}
        />

        <Stack gap="md">
          <DateRangeFilter
            dateFrom={dateRange.from}
            dateTo={dateRange.to}
            onChange={(type, value) =>
              setDateRange((prev) => ({ ...prev, [type]: value }))
            }
          />
          <Group gap="md" align="flex-start" wrap="wrap">
            <GroupBySelector value={groupBy} onChange={setGroupBy} />
            <Stack gap="xs" w={{ base: '100%', sm: 300 }}>
              <Text size="sm" fw={500}>
                {t('statistics.debt.filterByEntity')}
              </Text>
              <Select
                items={entityOptions}
                value={entityId || null}
                onChange={(value) => setEntityId(value)}
                placeholder={t('statistics.debt.selectEntity')}
                searchable
                clearable
              />
            </Stack>
          </Group>
        </Stack>

        <Stack gap="md">
          <DebtOverview queryParams={queryParams} />
        </Stack>

        <Stack gap="md">
          <DebtTimeChart queryParams={queryParams} />
        </Stack>

        <Stack gap="md">
          <EntityDebtsTable queryParams={queryParams} />
        </Stack>

        <Stack gap="md">
          <LoanHistoryTable queryParams={queryParams} />
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default DebtStatisticsPage;
