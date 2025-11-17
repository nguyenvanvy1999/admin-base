import {
  type DebtTransaction,
  useDebtTransactions,
} from '@client/hooks/queries/useDebtQueries';
import { formatCurrency } from '@client/lib/format';
import { Badge, Box, Button, Group, Text } from '@mantine/core';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';

export interface DebtTransactionTableProps {
  dateRange: { from: Date | null; to: Date | null };
  onPay: (transaction: DebtTransaction) => void;
  onReceive: (transaction: DebtTransaction) => void;
}

export const DebtTransactionTable = ({
  dateRange,
  onPay,
  onReceive,
}: DebtTransactionTableProps) => {
  const { t } = useTranslation();
  const { data: transactions = [], isLoading } = useDebtTransactions(dateRange);

  const entityAccessor = useMemo(
    () => (row: DebtTransaction) => {
      return row.entity?.id || 'unknown';
    },
    [],
  );

  const columns = useMemo(
    (): DataTableColumn<DebtTransaction>[] => [
      {
        id: 'entity',
        accessor: entityAccessor,
        title: 'transactions.entity',
        enableGrouping: true,
        GroupedCell: ({ row, cell }: any) => {
          const subRows = row.subRows || [];
          if (subRows.length === 0) return null;

          const firstTransaction = subRows[0]?.original as DebtTransaction;
          const entity = firstTransaction.entity;
          const type = firstTransaction.type;
          const currency =
            firstTransaction.currency?.code ||
            firstTransaction.account?.currency?.code ||
            'VND';

          const totalRemaining = subRows.reduce((sum: number, subRow: any) => {
            const tx = subRow.original as DebtTransaction;
            return sum + (tx.remainingAmount || 0);
          }, 0);

          return (
            <Box>
              <Group gap="sm" align="center">
                <Text fw={600} size="sm">
                  {entity?.name || t('debts.unknown')}
                </Text>
                <Badge
                  color={type === 'loan_given' ? 'red' : 'blue'}
                  variant="outline"
                  size="sm"
                >
                  {type === 'loan_given'
                    ? t('debts.loanGiven')
                    : t('debts.loanReceived')}
                </Badge>
                <Text size="sm" c="dimmed">
                  ({subRows.length}{' '}
                  {t('common.results', { defaultValue: 'items' })})
                </Text>
              </Group>
              <Text size="sm" fw={500} mt={4}>
                {t('debts.total')}: {formatCurrency(totalRemaining, currency)}
              </Text>
            </Box>
          );
        },
        render: (_, row: DebtTransaction) => (
          <Text size="sm">{row.entity?.name || t('debts.unknown')}</Text>
        ),
        enableSorting: false,
      },
      {
        accessor: 'date',
        title: 'debts.date',
        format: 'date',
        enableSorting: false,
      },
      {
        accessor: 'note',
        title: 'debts.description',
        ellipsis: true,
        enableSorting: false,
        render: (_, row: DebtTransaction) => (
          <Text size="sm">{row.note || t('debts.noDescription')}</Text>
        ),
      },
      {
        id: 'amount',
        accessor: (row: DebtTransaction) => parseFloat(String(row.amount)),
        title: 'debts.amount',
        format: 'currency',
        currency: (row: DebtTransaction) =>
          row.currency?.code || row.account?.currency?.code || 'VND',
        render: (_, row: DebtTransaction) => {
          const amount = parseFloat(String(row.amount));
          const currency =
            row.currency?.code || row.account?.currency?.code || 'VND';
          return (
            <Group gap={4}>
              {row.type === 'loan_given' ? (
                <IconArrowDown size={16} color="red" />
              ) : (
                <IconArrowUp size={16} color="blue" />
              )}
              <Text size="sm">{formatCurrency(amount, currency)}</Text>
            </Group>
          );
        },
        enableSorting: false,
      },
      {
        id: 'remainingAmount',
        accessor: (row: DebtTransaction) => row.remainingAmount || 0,
        title: 'debts.remainingAmount',
        format: 'currency',
        currency: (row: DebtTransaction) =>
          row.currency?.code || row.account?.currency?.code || 'VND',
        aggregationFn: 'sum',
        AggregatedCell: ({ row, cell }: any) => {
          const aggregatedValue = cell.getValue() as number;
          const subRows = row.subRows || [];
          const firstTransaction = subRows[0]?.original as DebtTransaction;
          const currency =
            firstTransaction?.currency?.code ||
            firstTransaction?.account?.currency?.code ||
            'VND';

          return (
            <Text size="sm" fw={600} c="blue">
              {t('debts.total')}: {formatCurrency(aggregatedValue, currency)}
            </Text>
          );
        },
        enableSorting: false,
      },
      {
        title: 'debts.actions',
        textAlign: 'center',
        width: '10rem',
        render: (_, row: DebtTransaction) => (
          <Group gap="xs" justify="center">
            {row.type === 'loan_given' ? (
              <Button
                size="xs"
                variant="outline"
                color="green"
                onClick={() => onReceive(row)}
              >
                {t('debts.receiveDebt')}
              </Button>
            ) : (
              <Button
                size="xs"
                variant="outline"
                color="red"
                onClick={() => onPay(row)}
              >
                {t('debts.payDebt')}
              </Button>
            )}
          </Group>
        ),
        enableSorting: false,
      },
    ],
    [t, onPay, onReceive, entityAccessor],
  );

  const grouping = useMemo(() => ['entity'], []);

  if (transactions.length === 0 && !isLoading) {
    return (
      <Box p="xl">
        <Text ta="center" c="dimmed">
          {t('debts.noDebts')}
        </Text>
      </Box>
    );
  }

  return (
    <DataTable
      data={transactions}
      columns={columns}
      loading={isLoading}
      enableGrouping={true}
      grouping={grouping}
      initialGrouping={grouping}
    />
  );
};
