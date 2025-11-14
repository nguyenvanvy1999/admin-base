import {
  type DateGroupLevel,
  dateGroupByDay,
  dateGroupByMonth,
  dateGroupByYear,
  formatDateGroupKey,
} from '@client/utils/dateGrouping';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  NumberFormatter,
  Select,
  Text,
} from '@mantine/core';
import type { TransactionDetail } from '@server/dto/transaction.dto';
import { TransactionType } from '@server/generated/prisma/enums';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';
import { getCategoryIcon, getCategoryLabel } from './utils/category';

type TransactionTableProps = {
  transactions: TransactionDetail[];
  onEdit: (transaction: TransactionDetail) => void;
  onDelete: (transaction: TransactionDetail) => void;
  isLoading?: boolean;
  showIndexColumn?: boolean;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: { id: string; desc: boolean }[];
  onSortingChange?: (
    updater:
      | { id: string; desc: boolean }[]
      | ((prev: { id: string; desc: boolean }[]) => {
          id: string;
          desc: boolean;
        }[]),
  ) => void;
};

const TransactionTable = ({
  transactions,
  onEdit,
  onDelete,
  isLoading = false,
  showIndexColumn = true,
  recordsPerPage,
  recordsPerPageOptions,
  onRecordsPerPageChange,
  page,
  onPageChange,
  totalRecords,
  sorting,
  onSortingChange,
}: TransactionTableProps) => {
  const { t, i18n } = useTranslation();
  const [groupingLevel, setGroupingLevel] = useState<DateGroupLevel | 'none'>(
    'none',
  );

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case TransactionType.income:
        return t('transactions.income');
      case TransactionType.expense:
        return t('transactions.expense');
      case TransactionType.transfer:
        return t('transactions.transfer');
      case TransactionType.loan_given:
        return t('transactions.loanGiven');
      case TransactionType.loan_received:
        return t('transactions.loanReceived');
      case TransactionType.repay_debt:
        return t('categories.repay_debt', { defaultValue: 'Repay Debt' });
      case TransactionType.collect_debt:
        return t('categories.collect_debt', { defaultValue: 'Collect Debt' });
      case TransactionType.investment:
        return t('transactions.investment');
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case TransactionType.income:
        return 'green';
      case TransactionType.expense:
        return 'red';
      case TransactionType.transfer:
        return 'blue';
      case TransactionType.loan_given:
      case TransactionType.collect_debt:
        return 'orange';
      case TransactionType.loan_received:
      case TransactionType.repay_debt:
        return 'cyan';
      default:
        return 'gray';
    }
  };

  const getDateAccessor = () => {
    switch (groupingLevel) {
      case 'day':
        return dateGroupByDay;
      case 'month':
        return dateGroupByMonth;
      case 'year':
        return dateGroupByYear;
      default:
        return 'date';
    }
  };

  const grouping = useMemo(() => {
    if (groupingLevel === 'none') return [];
    return ['date'];
  }, [groupingLevel]);

  const columns = useMemo(
    (): DataTableColumn<TransactionDetail>[] => [
      {
        accessor:
          groupingLevel === 'none'
            ? 'date'
            : (getDateAccessor() as (row: TransactionDetail) => string),
        title: 'transactions.date',
        enableGrouping: groupingLevel !== 'none',
        GroupedCell:
          groupingLevel !== 'none'
            ? ({ cell, table }: any) => {
                const groupValue = cell.getValue() as string;
                const formatted = formatDateGroupKey(
                  groupValue,
                  groupingLevel as DateGroupLevel,
                  i18n.language || 'en',
                );
                const count = cell.row.subRows?.length || 0;
                return (
                  <Box
                    style={{
                      color: 'var(--mantine-color-blue-6)',
                      fontWeight: 'bold',
                    }}
                  >
                    <strong>{formatted}</strong> ({count})
                  </Box>
                );
              }
            : undefined,
      },
      {
        accessor: 'type',
        title: 'transactions.type',
        render: (value, row: TransactionDetail) => (
          <Badge color={getTransactionTypeColor(row.type)}>
            {getTransactionTypeLabel(row.type)}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessor: (row) => row.account?.name ?? '',
        title: 'transactions.account',
        enableSorting: false,
      },
      {
        enableSorting: false,
        accessor: (row) => row.category?.name,
        title: 'transactions.category',
        render: (value, row: TransactionDetail) => {
          const category = row.category;
          if (!category) {
            return (
              <Text size="sm" c="dimmed">
                -
              </Text>
            );
          }

          const IconComponent = category.icon
            ? getCategoryIcon(category.icon)
            : null;
          const categoryLabel = getCategoryLabel(category.name, t);

          return (
            <Group gap="xs" justify="center">
              {IconComponent && (
                <IconComponent
                  style={{
                    fontSize: 18,
                    color: category.color || 'inherit',
                    opacity: 0.8,
                  }}
                />
              )}
              {category.color && (
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: category.color,
                  }}
                />
              )}
              <Text size="sm">{categoryLabel}</Text>
            </Group>
          );
        },
      },
      {
        accessor: 'amount',
        title: 'transactions.amount',
        aggregationFn: groupingLevel !== 'none' ? 'sum' : undefined,
        AggregatedCell:
          groupingLevel !== 'none'
            ? ({ cell, table }: any) => {
                const aggregatedValue = cell.getValue() as number;
                const subRows = cell.row.subRows || [];
                const firstTransaction = subRows[0]?.original as
                  | TransactionDetail
                  | undefined;
                const currencySymbol =
                  firstTransaction?.account?.currency?.symbol || '';
                return (
                  <Box
                    style={{
                      color: 'var(--mantine-color-green-6)',
                      fontWeight: 'bold',
                    }}
                  >
                    {t('transactions.totalAmount', { defaultValue: 'Total' })}:{' '}
                    <NumberFormatter
                      value={Math.abs(aggregatedValue)}
                      prefix={currencySymbol ? `${currencySymbol} ` : ''}
                      thousandSeparator=","
                      decimalScale={2}
                    />
                  </Box>
                );
              }
            : undefined,
        render: (value, row: TransactionDetail) => {
          const amount = parseFloat(String(row.amount));
          const isExpense = row.type === TransactionType.expense;
          const isIncome = row.type === TransactionType.income;
          const color = isExpense ? 'red' : isIncome ? 'green' : undefined;
          const currencySymbol = row.account?.currency?.symbol || '';

          return (
            <Text size="sm" fw={500} c={color}>
              {isIncome && (
                <Text component="span" mr={4}>
                  +
                </Text>
              )}
              <NumberFormatter
                value={isExpense ? -amount : amount}
                prefix={currencySymbol ? `${currencySymbol} ` : ''}
                thousandSeparator=","
                decimalScale={2}
                allowNegative={true}
              />
            </Text>
          );
        },
      },
      {
        enableSorting: false,
        accessor: (row) => row.event?.name,
        title: 'transactions.event',
        render: (value, row: TransactionDetail) => {
          const event = row.event;
          if (!event) {
            return (
              <Text size="sm" c="dimmed">
                -
              </Text>
            );
          }

          return <Text size="sm">{event.name}</Text>;
        },
      },
      {
        accessor: 'note',
        title: 'transactions.description',
        ellipsis: true,
        enableSorting: false,
      },
      {
        title: 'transactions.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value, row: TransactionDetail) => (
          <Group gap="xs" justify="center">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ),
      },
    ],
    [t, onEdit, onDelete, groupingLevel, i18n.language],
  );

  return (
    <div>
      <Group mb="md">
        <Select
          label={t('transactions.groupBy', { defaultValue: 'Group by' })}
          value={groupingLevel}
          onChange={(value) =>
            setGroupingLevel((value as DateGroupLevel | 'none') || 'none')
          }
          data={[
            {
              value: 'none',
              label: t('transactions.noGrouping', {
                defaultValue: 'No Grouping',
              }),
            },
            {
              value: 'day',
              label: t('transactions.groupByDay', { defaultValue: 'Day' }),
            },
            {
              value: 'month',
              label: t('transactions.groupByMonth', { defaultValue: 'Month' }),
            },
            {
              value: 'year',
              label: t('transactions.groupByYear', { defaultValue: 'Year' }),
            },
          ]}
          style={{ maxWidth: '200px' }}
        />
      </Group>
      <DataTable
        data={transactions}
        columns={columns}
        loading={isLoading}
        showIndexColumn={showIndexColumn}
        recordsPerPage={recordsPerPage}
        recordsPerPageOptions={recordsPerPageOptions}
        onRecordsPerPageChange={onRecordsPerPageChange}
        page={page}
        onPageChange={onPageChange}
        totalRecords={totalRecords}
        sorting={sorting}
        onSortingChange={onSortingChange}
        enableGrouping={groupingLevel !== 'none'}
        grouping={grouping}
        onGroupingChange={(updater) => {
          const next =
            typeof updater === 'function' ? updater(grouping) : updater;
          if (next.length === 0) {
            setGroupingLevel('none');
          }
        }}
        initialGrouping={groupingLevel !== 'none' ? grouping : undefined}
      />
    </div>
  );
};

export default TransactionTable;
