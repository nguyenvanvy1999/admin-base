import {
  dateGroupByDay,
  dateGroupByMonth,
  dateGroupByYear,
} from '@client/utils/dateGrouping';
import { Box, Group, NumberFormatter, Text } from '@mantine/core';
import type { TransactionDetail } from '@server/dto/transaction.dto';
import { TransactionType } from '@server/generated';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getCategoryIcon, getCategoryLabel } from '../utils/category';
import {
  createActionColumn,
  createCurrencyColumn,
  createTextColumn,
  createTypeColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import type { GroupingLevel } from './groupingUtils';
import {
  createDateGroupingConfig,
  GroupingSelector,
  useTableGrouping,
} from './groupingUtils';

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
  const { groupingLevel, setGroupingLevel, grouping, enableGrouping } =
    useTableGrouping('none' as GroupingLevel);

  const dateAccessor = useCallback(
    (row: TransactionDetail) => {
      switch (groupingLevel) {
        case 'day':
          return dateGroupByDay(row);
        case 'month':
          return dateGroupByMonth(row);
        case 'year':
          return dateGroupByYear(row);
        default:
          return row.date;
      }
    },
    [groupingLevel],
  );

  const dateGroupingConfig = useMemo(
    () =>
      createDateGroupingConfig<TransactionDetail>(
        groupingLevel,
        dateAccessor,
        i18n.language || 'en',
      ),
    [groupingLevel, dateAccessor, i18n.language],
  );

  const columns = useMemo(
    (): DataTableColumn<TransactionDetail>[] => [
      {
        id: 'date',
        accessor: dateAccessor as (row: TransactionDetail) => string,
        title: 'transactions.date',
        enableGrouping: enableGrouping,
        GroupedCell: dateGroupingConfig.GroupedCell,
      },
      createTypeColumn<TransactionDetail, 'type'>({
        accessor: 'type',
        title: 'transactions.type',
        enableSorting: false,
        labelMap: {
          [TransactionType.income]: t('transactions.income'),
          [TransactionType.expense]: t('transactions.expense'),
          [TransactionType.transfer]: t('transactions.transfer'),
          [TransactionType.loan_given]: t('transactions.loanGiven'),
          [TransactionType.loan_received]: t('transactions.loanReceived'),
          [TransactionType.repay_debt]: t('categories.repay_debt', {
            defaultValue: 'Repay Debt',
          }),
          [TransactionType.collect_debt]: t('categories.collect_debt', {
            defaultValue: 'Collect Debt',
          }),
          [TransactionType.investment]: t('transactions.investment'),
        },
        colorMap: {
          [TransactionType.income]: 'green',
          [TransactionType.expense]: 'red',
          [TransactionType.transfer]: 'blue',
          [TransactionType.loan_given]: 'orange',
          [TransactionType.collect_debt]: 'orange',
          [TransactionType.loan_received]: 'cyan',
          [TransactionType.repay_debt]: 'cyan',
          [TransactionType.investment]: 'purple',
        },
      }),
      createTextColumn<TransactionDetail, (row: TransactionDetail) => string>({
        accessor: (row) => row.account?.name ?? '',
        title: 'transactions.account',
        enableSorting: false,
      }),
      {
        enableSorting: false,
        accessor: (row: TransactionDetail) => row.category,
        title: 'transactions.category',
        render: (category: TransactionDetail['category'], _row, _rowIndex) => {
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
      createCurrencyColumn<
        TransactionDetail,
        (row: TransactionDetail) => number
      >({
        id: 'amount',
        accessor: (row) => {
          const amount = parseFloat(String(row.amount));
          return row.type === TransactionType.expense ? -amount : amount;
        },
        title: 'transactions.amount',
        enableGrouping: enableGrouping,
        aggregationFn: enableGrouping ? 'sum' : undefined,
        AggregatedCell: enableGrouping
          ? ({ row, cell }: any) => {
              const aggregatedValue = cell.getValue() as number;
              const subRows = row.subRows || [];
              const firstTransaction = subRows[0]?.original as
                | TransactionDetail
                | undefined;
              const currencySymbol =
                firstTransaction?.account?.currency?.symbol || '';
              const isPositive = aggregatedValue >= 0;
              return (
                <Box
                  style={{
                    color: isPositive
                      ? 'var(--mantine-color-green-6)'
                      : 'var(--mantine-color-red-6)',
                    fontWeight: 'bold',
                  }}
                >
                  {t('transactions.totalAmount', { defaultValue: 'Total' })}:{' '}
                  <NumberFormatter
                    value={aggregatedValue}
                    prefix={currencySymbol ? `${currencySymbol} ` : ''}
                    thousandSeparator=","
                    decimalScale={2}
                    allowNegative={true}
                  />
                </Box>
              );
            }
          : undefined,
        getSymbol: (row) => row.account?.currency?.symbol,
        decimalScale: 2,
        allowNegative: true,
        showPlus: true,
        getColor: (value, row) => {
          if (row.type === TransactionType.expense) return 'red';
          if (row.type === TransactionType.income) return 'green';
          return undefined;
        },
      }),
      createTextColumn<
        TransactionDetail,
        (row: TransactionDetail) => string | undefined
      >({
        enableSorting: false,
        accessor: (row) => row.event?.name,
        title: 'transactions.event',
        transform: (value) => {
          if (!value) {
            return (
              <Text size="sm" c="dimmed">
                -
              </Text>
            );
          }
          return <Text size="sm">{value}</Text>;
        },
      }),
      createTextColumn<TransactionDetail, 'note'>({
        accessor: 'note',
        title: 'transactions.description',
        ellipsis: true,
        enableSorting: false,
      }),
      createActionColumn<TransactionDetail>({
        title: 'transactions.actions',
        onEdit,
        onDelete,
      }),
    ],
    [
      t,
      onEdit,
      onDelete,
      groupingLevel,
      i18n.language,
      dateAccessor,
      enableGrouping,
      dateGroupingConfig,
    ],
  );

  return (
    <div>
      <GroupingSelector value={groupingLevel} onChange={setGroupingLevel} />
      <DataTable
        key={`table-${groupingLevel}`}
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
        enableGrouping={enableGrouping}
        grouping={grouping}
        onGroupingChange={(updater) => {
          const next =
            typeof updater === 'function' ? updater(grouping) : updater;
          if (next.length === 0) {
            setGroupingLevel('none');
          }
        }}
        initialGrouping={enableGrouping ? grouping : undefined}
      />
    </div>
  );
};

export default TransactionTable;
