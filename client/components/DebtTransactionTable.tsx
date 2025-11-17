import { useDebtTransactions } from '@client/hooks/queries/useDebtQueries';
import { formatCurrency } from '@client/lib/format';
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface DebtTransactionTableProps {
  dateRange: { from: Date | null; to: Date | null };
  onPay: (transaction: any) => void;
  onReceive: (transaction: any) => void;
}

export const DebtTransactionTable = ({
  dateRange,
  onPay,
  onReceive,
}: DebtTransactionTableProps) => {
  const { t } = useTranslation();
  const { data: transactions = [], isLoading } = useDebtTransactions(dateRange);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, any[]> = {};

    transactions.forEach((transaction) => {
      const entityId = transaction.entity?.id || 'unknown';
      if (!groups[entityId]) {
        groups[entityId] = [];
      }
      groups[entityId].push(transaction);
    });

    return Object.entries(groups).map(([entityId, entityTransactions]) => ({
      entity: entityTransactions[0].entity,
      transactions: entityTransactions,
      total: entityTransactions.reduce((sum, t) => sum + t.remainingAmount, 0),
      type: entityTransactions[0].type,
    }));
  }, [transactions]);

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="md" />
        <Text c="dimmed">{t('common.loading')}</Text>
      </Group>
    );
  }

  if (transactions.length === 0) {
    return (
      <Box p="xl">
        <Text ta="center" c="dimmed">
          {t('debts.noDebts')}
        </Text>
      </Box>
    );
  }

  return (
    <Box mt="md">
      {groupedTransactions.map((group) => (
        <Box key={group.entity?.id} mb="xl">
          <Group justify="space-between" mb="sm">
            <Title order={4}>
              {group.entity?.name || t('debts.unknown')}
              <Badge
                color={group.type === 'loan_given' ? 'red' : 'blue'}
                ml="sm"
                variant="outline"
              >
                {group.type === 'loan_given'
                  ? t('debts.loanGiven')
                  : t('debts.loanReceived')}
              </Badge>
            </Title>
            <Text fw={500}>
              {t('debts.total')}:{' '}
              {formatCurrency(group.total, group.entity?.currency || 'VND')}
            </Text>
          </Group>

          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>{t('debts.date')}</th>
                <th>{t('debts.description')}</th>
                <th>{t('debts.amount')}</th>
                <th>{t('debts.remainingAmount')}</th>
                <th>{t('debts.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {group.transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    {new Date(transaction.date).toLocaleDateString('vi-VN')}
                  </td>
                  <td>{transaction.description || t('debts.noDescription')}</td>
                  <td>
                    <Group gap={4}>
                      {transaction.type === 'loan_given' ? (
                        <IconArrowDown size={16} color="red" />
                      ) : (
                        <IconArrowUp size={16} color="blue" />
                      )}
                      {formatCurrency(
                        transaction.amount,
                        transaction.currency || 'VND',
                      )}
                    </Group>
                  </td>
                  <td>
                    {formatCurrency(
                      transaction.remainingAmount,
                      transaction.currency || 'VND',
                    )}
                  </td>
                  <td>
                    {transaction.type === 'loan_given' ? (
                      <Button
                        size="xs"
                        variant="outline"
                        color="green"
                        onClick={() => onReceive(transaction)}
                      >
                        {t('debts.receiveDebt')}
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        color="red"
                        onClick={() => onPay(transaction)}
                      >
                        {t('debts.payDebt')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      ))}
    </Box>
  );
};
