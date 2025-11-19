import { StatCard } from '@client/components/StatCard';
import { DataTable, type DataTableColumn } from '@client/components/tables';
import { useGoalDetailQuery } from '@client/hooks/queries/useGoalQueries';
import {
  Button,
  Card,
  Center,
  Container,
  Group,
  NumberFormatter,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type { GoalDetailResponse } from '@server/dto/goal.dto';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

const GoalDetailPage = () => {
  const { goalId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!goalId) {
    return (
      <Center h="100vh">
        <Text c="red">
          {t('goals.invalidId', {
            defaultValue: 'Goal identifier is missing.',
          })}
        </Text>
      </Center>
    );
  }

  const { data: goal, isLoading } = useGoalDetailQuery(goalId);

  const formatCurrency = (
    value: string | number | null | undefined,
    symbol?: string | null,
  ) => {
    if (value === null || value === undefined) return '--';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '--';
    const prefix = symbol ? `${symbol} ` : '';
    return (
      <NumberFormatter
        value={numValue}
        prefix={prefix}
        thousandSeparator=","
        decimalScale={2}
      />
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const accountColumns = useMemo(
    (): DataTableColumn<GoalDetailResponse['accounts'][0]>[] => [
      {
        accessor: 'name',
        title: 'goals.accountName',
      },
      {
        accessor: 'balance',
        title: 'goals.accountBalance',
        textAlign: 'right',
        render: ({ row }) => formatCurrency(row.balance, row.currency?.symbol),
      },
      {
        accessor: 'currency.code',
        title: 'goals.currency',
        render: ({ row }) => row.currency?.code || '--',
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <Center h="100vh">
        <Text c="dimmed">
          {t('common.loading', { defaultValue: 'Loading...' })}
        </Text>
      </Center>
    );
  }

  if (!goal) {
    return (
      <Center h="100vh">
        <Text c="red">
          {t('goals.notFound', {
            defaultValue: 'Goal not found',
          })}
        </Text>
      </Center>
    );
  }

  const progressPercent = Math.min(Math.max(goal.progressPercent, 0), 100);
  const isOverTarget = goal.progressPercent > 100;
  const currencySymbol = goal.currency?.symbol || '';

  return (
    <Container fluid py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => navigate('/goals')}
            >
              {t('common.back', { defaultValue: 'Back' })}
            </Button>
            <Stack gap="xs">
              <Title order={2}>
                {goal.name ??
                  t('goals.detailTitle', {
                    defaultValue: 'Goal detail',
                  })}
              </Title>
            </Stack>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          <StatCard
            label={t('goals.targetAmount', {
              defaultValue: 'Target Amount',
            })}
            value={formatCurrency(goal.amount, currencySymbol)}
          />
          <StatCard
            label={t('goals.currentAmount', {
              defaultValue: 'Current Amount',
            })}
            value={formatCurrency(goal.currentAmount, currencySymbol)}
          />
          <StatCard
            label={t('goals.progress', {
              defaultValue: 'Progress',
            })}
            value={`${progressPercent.toFixed(1)}%`}
            color={isOverTarget ? 'green.6' : 'blue.6'}
          />
          <StatCard
            label={t('goals.remainingAmount', {
              defaultValue: 'Remaining Amount',
            })}
            value={formatCurrency(goal.remainingAmount, currencySymbol)}
            color={parseFloat(goal.remainingAmount) >= 0 ? 'blue.6' : 'green.6'}
          />
          {goal.daysRemaining !== null && (
            <StatCard
              label={t('goals.daysRemaining', {
                defaultValue: 'Days Remaining',
              })}
              value={
                goal.daysRemaining > 0
                  ? String(goal.daysRemaining)
                  : t('goals.expired', { defaultValue: 'Expired' })
              }
              color={goal.daysRemaining > 0 ? 'blue.6' : 'red.6'}
            />
          )}
          {goal.averageDailyNeeded && (
            <StatCard
              label={t('goals.averageDailyNeeded', {
                defaultValue: 'Average Daily Needed',
              })}
              value={formatCurrency(goal.averageDailyNeeded, currencySymbol)}
              color="orange.6"
            />
          )}
        </SimpleGrid>

        <Card shadow="sm" padding="lg" withBorder>
          <Stack gap="md">
            <Title order={4}>
              {t('goals.progress', { defaultValue: 'Progress' })}
            </Title>
            <Progress
              value={progressPercent}
              color={isOverTarget ? 'green' : 'blue'}
              size="xl"
              radius="md"
            />
            <Text size="sm" c="dimmed">
              {formatCurrency(goal.currentAmount, currencySymbol)} /{' '}
              {formatCurrency(goal.amount, currencySymbol)} (
              {progressPercent.toFixed(1)}%)
            </Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" withBorder>
          <Title order={4} mb="md">
            {t('goals.accounts', { defaultValue: 'Accounts' })}
          </Title>
          <DataTable
            data={goal.accounts || []}
            columns={accountColumns}
            loading={false}
            showIndexColumn={false}
          />
        </Card>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                {t('goals.startDate', { defaultValue: 'Start Date' })}
              </Text>
              <Text size="lg" fw={600}>
                {formatDate(goal.startDate)}
              </Text>
            </Stack>
          </Card>
          {goal.endDate && (
            <Card shadow="sm" padding="lg" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t('goals.endDate', { defaultValue: 'End Date' })}
                </Text>
                <Text size="lg" fw={600}>
                  {formatDate(goal.endDate)}
                </Text>
              </Stack>
            </Card>
          )}
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

export default GoalDetailPage;
