import { PageContainer, PageHeader } from '@client/components';
import {
  AccountBreakdownChart,
  CategoryBreakdownChart,
  DateRangeFilter,
  FeeStatistics,
  FilterBar,
  GroupBySelector,
  IncomeExpenseOverview,
  IncomeExpenseTable,
  IncomeExpenseTimeChart,
} from '@client/components/statistics';
import { Group, SimpleGrid, Stack } from '@mantine/core';
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
    <PageContainer>
      <Stack gap="xl">
        <PageHeader
          title={t('statistics.incomeExpense.title', {
            defaultValue: 'Income & Expense Statistics',
          })}
          description={t('statistics.incomeExpense.description', {
            defaultValue: 'Detailed analysis of your income and expenses',
          })}
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
          </Group>
          <FilterBar
            categoryIds={categoryIds}
            accountId={accountId || undefined}
            entityId={entityId || undefined}
            onCategoryChange={setCategoryIds}
            onAccountChange={setAccountId}
            onEntityChange={setEntityId}
          />
        </Stack>

        <Stack gap="md">
          <IncomeExpenseOverview queryParams={queryParams} />
        </Stack>

        <Stack gap="md">
          <IncomeExpenseTimeChart queryParams={queryParams} />
        </Stack>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <CategoryBreakdownChart queryParams={queryParams} />
          <AccountBreakdownChart queryParams={queryParams} />
        </SimpleGrid>

        <Stack gap="md">
          <FeeStatistics queryParams={queryParams} />
        </Stack>

        <Stack gap="md">
          <IncomeExpenseTable queryParams={queryParams} />
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default IncomeExpenseStatisticsPage;
