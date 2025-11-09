import type { TransactionFull } from '@client/types/transaction';
import {
  Badge,
  Box,
  NumberFormatter,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { TransactionType } from '@server/generated/prisma/enums';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, {
  type DataTableColumn,
  type DataTableProps,
} from './DataTable';
import { getCategoryIcon, getCategoryLabel } from './utils/category';

type TransactionTableProps = {
  transactions: TransactionFull[];
  onEdit: (transaction: TransactionFull) => void;
  onDelete: (transaction: TransactionFull) => void;
  isLoading?: boolean;
  summary?: Array<{
    currency: {
      id: string;
      code: string;
      name: string;
      symbol: string | null;
    };
    totalIncome: number;
    totalExpense: number;
  }>;
} & Pick<
  DataTableProps<TransactionFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

const TransactionTable = ({
  transactions,
  onEdit,
  onDelete,
  isLoading = false,
  summary,
  search,
  pageSize,
  filters,
  pagination,
  sorting,
}: TransactionTableProps) => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

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
      default:
        return 'gray';
    }
  };

  const columns = useMemo(
    (): DataTableColumn<TransactionFull>[] => [
      {
        accessor: 'date',
        title: 'transactions.date',
        enableSorting: true,
        format: 'date',
      },
      {
        accessor: 'type',
        title: 'transactions.type',
        enableSorting: true,
        render: (value) => (
          <Badge color={getTransactionTypeColor(value)}>
            {getTransactionTypeLabel(value)}
          </Badge>
        ),
      },
      {
        accessor: 'account.name',
        id: 'accountId',
        title: 'transactions.account',
        enableSorting: true,
      },
      {
        accessor: 'category.name',
        title: 'transactions.category',
        enableSorting: false,
        render: (value, row) => {
          const category = row.category;
          if (!category) {
            return (
              <div className="text-sm text-gray-500 dark:text-gray-400">-</div>
            );
          }

          const IconComponent = category.icon
            ? getCategoryIcon(category.icon)
            : null;
          const categoryLabel = getCategoryLabel(category.name, t);

          return (
            <div className="flex items-center gap-2">
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
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {categoryLabel}
              </span>
            </div>
          );
        },
      },
      {
        accessor: 'amount',
        title: 'transactions.amount',
        enableSorting: true,
        format: 'currency',
        currency: (row) => row.account.currency.symbol || null,
        numberFormat: {
          decimalScale: 2,
          thousandSeparator: ',',
        },
        render: (value, row) => {
          const amount = parseFloat(String(value));
          const isExpense = row.type === TransactionType.expense;
          const isIncome = row.type === TransactionType.income;
          const colorClass = isExpense
            ? 'text-red-600 dark:text-red-400'
            : isIncome
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-900 dark:text-gray-100';
          const currencySymbol = row.account.currency.symbol || '';

          return (
            <div className={`text-sm font-medium ${colorClass}`}>
              {isIncome && <span className="mr-1">+</span>}
              <NumberFormatter
                value={isExpense ? -amount : amount}
                prefix={currencySymbol ? `${currencySymbol} ` : ''}
                thousandSeparator=","
                decimalScale={2}
                allowNegative={true}
              />
            </div>
          );
        },
      },
      {
        accessor: 'note',
        title: 'transactions.description',
        enableSorting: false,
        ellipsis: true,
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      {summary && summary.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-sm py-2 border-b border-gray-200 dark:border-gray-700">
          {summary.map((item) => (
            <div key={item.currency.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Text size="sm" className="text-gray-600 dark:text-gray-400">
                  {t('transactions.totalIncome', { defaultValue: 'Tổng thu' })}:
                </Text>
                <span
                  className="font-bold"
                  style={{
                    color: isDark ? 'rgb(34 197 94)' : 'rgb(21 128 61)',
                  }}
                >
                  <NumberFormatter
                    value={item.totalIncome}
                    prefix={
                      item.currency.symbol ? `${item.currency.symbol} ` : ''
                    }
                    thousandSeparator=","
                    decimalScale={2}
                  />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Text size="sm" className="text-gray-600 dark:text-gray-400">
                  {t('transactions.totalExpense', { defaultValue: 'Tổng chi' })}
                  :
                </Text>
                <span
                  className="font-bold"
                  style={{
                    color: isDark ? 'rgb(248 113 113)' : 'rgb(185 28 28)',
                  }}
                >
                  <NumberFormatter
                    value={item.totalExpense}
                    prefix={
                      item.currency.symbol ? `${item.currency.symbol} ` : ''
                    }
                    thousandSeparator=","
                    decimalScale={2}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <DataTable
        data={transactions}
        columns={columns}
        isLoading={isLoading}
        actions={{
          onEdit,
          onDelete,
          headerLabel: t('transactions.actions'),
        }}
        onRowClick={onEdit}
        emptyMessage={t('transactions.noTransactions')}
        search={search}
        pageSize={pageSize}
        filters={filters}
        pagination={pagination}
        sorting={sorting}
      />
    </div>
  );
};

export default TransactionTable;
