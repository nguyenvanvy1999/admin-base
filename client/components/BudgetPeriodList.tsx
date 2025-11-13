import { Badge, Card, Table, Text } from '@mantine/core';
import type { BudgetPeriodDetailResponse } from '@server/dto/budget.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type BudgetPeriodListProps = {
  periods: BudgetPeriodDetailResponse[];
  isLoading?: boolean;
  onPeriodClick?: (period: BudgetPeriodDetailResponse) => void;
};

const BudgetPeriodList = ({
  periods,
  isLoading = false,
  onPeriodClick,
}: BudgetPeriodListProps) => {
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
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (periods.length === 0) {
    return (
      <Card>
        <Text c="dimmed">
          {t('budgets.noPeriods', { defaultValue: 'No periods found' })}
        </Text>
      </Card>
    );
  }

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            {t('budgets.periodStartDate', { defaultValue: 'Start Date' })}
          </Table.Th>
          <Table.Th>
            {t('budgets.periodEndDate', { defaultValue: 'End Date' })}
          </Table.Th>
          <Table.Th>
            {t('budgets.budgetAmount', { defaultValue: 'Budget' })}
          </Table.Th>
          <Table.Th>
            {t('budgets.carriedOverAmount', { defaultValue: 'Carried Over' })}
          </Table.Th>
          <Table.Th>
            {t('budgets.totalAmount', { defaultValue: 'Total' })}
          </Table.Th>
          <Table.Th>
            {t('budgets.spentAmount', { defaultValue: 'Spent' })}
          </Table.Th>
          <Table.Th>
            {t('budgets.remainingAmount', { defaultValue: 'Remaining' })}
          </Table.Th>
          <Table.Th>{t('budgets.status', { defaultValue: 'Status' })}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {periods.map((period) => {
          const remaining = parseFloat(period.remainingAmount);
          const isOver = period.isOverBudget;
          const isGood = remaining > 0 && !isOver;

          return (
            <Table.Tr
              key={period.id}
              onClick={() => onPeriodClick?.(period)}
              style={{ cursor: onPeriodClick ? 'pointer' : 'default' }}
            >
              <Table.Td>{formatDate(period.periodStartDate)}</Table.Td>
              <Table.Td>{formatDate(period.periodEndDate)}</Table.Td>
              <Table.Td>{formatCurrency(period.budgetAmount)}</Table.Td>
              <Table.Td>{formatCurrency(period.carriedOverAmount)}</Table.Td>
              <Table.Td>{formatCurrency(period.totalAmount)}</Table.Td>
              <Table.Td>{formatCurrency(period.spentAmount)}</Table.Td>
              <Table.Td>
                <Text c={isOver ? 'red' : isGood ? 'green' : 'gray'}>
                  {formatCurrency(period.remainingAmount)}
                </Text>
              </Table.Td>
              <Table.Td>
                {isOver ? (
                  <Badge color="red">
                    {t('budgets.overBudget', { defaultValue: 'Over Budget' })}
                  </Badge>
                ) : isGood ? (
                  <Badge color="green">
                    {t('budgets.onTrack', { defaultValue: 'On Track' })}
                  </Badge>
                ) : (
                  <Badge color="gray">
                    {t('budgets.exhausted', { defaultValue: 'Exhausted' })}
                  </Badge>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};

export default BudgetPeriodList;
