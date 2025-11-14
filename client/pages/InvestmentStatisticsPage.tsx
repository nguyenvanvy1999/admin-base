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
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>
            {t('statistics.investment.title', {
              defaultValue: 'Investment Statistics',
            })}
          </Title>
          <Text c="dimmed">
            {t('statistics.investment.description', {
              defaultValue: 'Detailed analysis of your investments',
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
            <Stack gap="xs" style={{ flex: 1, maxWidth: '300px' }}>
              <Text size="sm" fw={500}>
                {t('statistics.filterByAccount', {
                  defaultValue: 'Filter by Account',
                })}
              </Text>
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
            </Stack>
          </Group>
        </Stack>

        <Stack gap="md">
          <InvestmentOverview queryParams={queryParams} />
        </Stack>

        <Stack gap="md">
          <InvestmentPerformanceChart queryParams={queryParams} />
        </Stack>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <TradeStatistics queryParams={queryParams} />
          <InvestmentFeesChart queryParams={queryParams} />
        </SimpleGrid>

        <Stack gap="md">
          <ContributionChart queryParams={queryParams} />
        </Stack>

        <Stack gap="md">
          <InvestmentTable queryParams={queryParams} />
        </Stack>
      </Stack>
    </Container>
  );
};

export default InvestmentStatisticsPage;
