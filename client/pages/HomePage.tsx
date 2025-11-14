import { DateRangePicker } from '@client/components';
import { InvestmentAllocationChart } from '@client/components/charts/InvestmentAllocationChart';
import { InvestmentPerformanceChart } from '@client/components/charts/InvestmentPerformanceChart';
import { SummaryCards } from '@client/components/charts/SummaryCards';
import { TransactionChart } from '@client/components/charts/TransactionChart';
import { AdminSummaryCards } from '@client/components/statistics/AdminSummaryCards';
import { UserGrowthChart } from '@client/components/statistics/UserGrowthChart';
import { UserRoleDistributionChart } from '@client/components/statistics/UserRoleDistributionChart';
import useUserStore from '@client/store/user';
import { Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
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
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Stack gap="xs">
            <Title order={1}>Admin Dashboard</Title>
            <Text c="dimmed">Overview of user and session statistics</Text>
          </Stack>

          <Stack gap="md">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              mode="date"
              label={t('common.dateRange', { defaultValue: 'Date Range' })}
            />
          </Stack>

          <Stack gap="md">
            <AdminSummaryCards />
          </Stack>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Stack style={{ gridColumn: '1 / -1' }}>
              <UserGrowthChart
                dateFrom={dateRange.from || ''}
                dateTo={dateRange.to || ''}
              />
            </Stack>
            <UserRoleDistributionChart />
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>
            {t('home.welcomeBack', { username: user?.username })}
          </Title>
          <Text c="dimmed">{t('home.successfullyLogged')}</Text>
        </Stack>

        <Stack gap="md">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            mode="date"
            label={t('common.dateRange', { defaultValue: 'Date Range' })}
          />
        </Stack>

        <Stack gap="md">
          <SummaryCards
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
          />
        </Stack>

        <Stack gap="md">
          <TransactionChart
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
            groupBy="month"
          />
        </Stack>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <InvestmentAllocationChart
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
          />
          <InvestmentPerformanceChart
            dateFrom={dateRange.from || ''}
            dateTo={dateRange.to || ''}
          />
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

export default HomePage;
