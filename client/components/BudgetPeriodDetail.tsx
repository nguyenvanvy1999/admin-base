import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';
import type { BudgetPeriodDetailResponse } from '@server/dto/budget.dto';
import { useTranslation } from 'react-i18next';

type BudgetPeriodDetailProps = {
  period: BudgetPeriodDetailResponse;
};

const BudgetPeriodDetail = ({ period }: BudgetPeriodDetailProps) => {
  const { t } = useTranslation();

  const formatCurrency = (value: string) => {
    const amount = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const remaining = parseFloat(period.remainingAmount);
  const isOver = period.isOverBudget;
  const isGood = remaining > 0 && !isOver;
  const spentPercent =
    (parseFloat(period.spentAmount) / parseFloat(period.totalAmount)) * 100;

  return (
    <Stack gap="md">
      <Card>
        <Title order={4}>
          {t('budgets.periodDetails', { defaultValue: 'Period Details' })}
        </Title>
        <Group mt="md" justify="space-between">
          <div>
            <Text size="sm" c="dimmed">
              {t('budgets.periodStartDate', { defaultValue: 'Start Date' })}
            </Text>
            <Text fw={500}>{formatDate(period.periodStartDate)}</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              {t('budgets.periodEndDate', { defaultValue: 'End Date' })}
            </Text>
            <Text fw={500}>{formatDate(period.periodEndDate)}</Text>
          </div>
        </Group>
      </Card>

      <Card>
        <Title order={4}>
          {t('budgets.financialSummary', { defaultValue: 'Financial Summary' })}
        </Title>
        <Stack gap="sm" mt="md">
          <Group justify="space-between">
            <Text>
              {t('budgets.budgetAmount', { defaultValue: 'Budget Amount' })}
            </Text>
            <Text fw={500}>{formatCurrency(period.budgetAmount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text>
              {t('budgets.carriedOverAmount', { defaultValue: 'Carried Over' })}
            </Text>
            <Text fw={500}>{formatCurrency(period.carriedOverAmount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>
              {t('budgets.totalAmount', { defaultValue: 'Total Available' })}
            </Text>
            <Text fw={600}>{formatCurrency(period.totalAmount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text>{t('budgets.spentAmount', { defaultValue: 'Spent' })}</Text>
            <Text fw={500} c={isOver ? 'red' : 'inherit'}>
              {formatCurrency(period.spentAmount)} ({spentPercent.toFixed(1)}%)
            </Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>
              {t('budgets.remainingAmount', { defaultValue: 'Remaining' })}
            </Text>
            <Text fw={600} c={isOver ? 'red' : isGood ? 'green' : 'gray'}>
              {formatCurrency(period.remainingAmount)}
            </Text>
          </Group>
          <Group justify="space-between" mt="md">
            <Text fw={600}>
              {t('budgets.status', { defaultValue: 'Status' })}
            </Text>
            {isOver ? (
              <Badge color="red" size="lg">
                {t('budgets.overBudget', { defaultValue: 'Over Budget' })}
              </Badge>
            ) : isGood ? (
              <Badge color="green" size="lg">
                {t('budgets.onTrack', { defaultValue: 'On Track' })}
              </Badge>
            ) : (
              <Badge color="gray" size="lg">
                {t('budgets.exhausted', { defaultValue: 'Exhausted' })}
              </Badge>
            )}
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
};

export default BudgetPeriodDetail;
