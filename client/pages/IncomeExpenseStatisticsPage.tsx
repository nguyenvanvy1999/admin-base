import { AccountBreakdownChart } from '@client/components/statistics/AccountBreakdownChart';
import { CategoryBreakdownChart } from '@client/components/statistics/CategoryBreakdownChart';
import { DateRangeFilter } from '@client/components/statistics/DateRangeFilter';
import { FeeStatistics } from '@client/components/statistics/FeeStatistics';
import { FilterBar } from '@client/components/statistics/FilterBar';
import { GroupBySelector } from '@client/components/statistics/GroupBySelector';
import { IncomeExpenseOverview } from '@client/components/statistics/IncomeExpenseOverview';
import { IncomeExpenseTable } from '@client/components/statistics/IncomeExpenseTable';
import { IncomeExpenseTimeChart } from '@client/components/statistics/IncomeExpenseTimeChart';
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
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
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>
            {t('statistics.incomeExpense.title', {
              defaultValue: 'Income & Expense Statistics',
            })}
          </Title>
          <Text c="dimmed">
            {t('statistics.incomeExpense.description', {
              defaultValue: 'Detailed analysis of your income and expenses',
            })}
          </Text>
        </Stack>

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
    </Container>
  );
};

export default IncomeExpenseStatisticsPage;
