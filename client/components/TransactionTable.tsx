import type { TransactionFull } from '@client/types/transaction';
import { Badge, Box, NumberFormatter } from '@mantine/core';
import { TransactionType } from '@server/generated/prisma/enums';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, { type DataTableProps } from './DataTable';
import { getCategoryIcon, getCategoryLabel } from './utils/category';

type TransactionTableProps = {
  transactions: TransactionFull[];
  onEdit: (transaction: TransactionFull) => void;
  onDelete: (transaction: TransactionFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<TransactionFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

const columnHelper = createColumnHelper<TransactionFull>();

const TransactionTable = ({
  transactions,
  onEdit,
  onDelete,
  isLoading = false,
  search,
  pageSize,
  filters,
  pagination,
  sorting,
}: TransactionTableProps) => {
  const { t } = useTranslation();

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor('date', {
          header: t('transactions.date'),
          enableSorting: true,
          cell: (info) => (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {formatDate(info.getValue())}
            </div>
          ),
        }),
        columnHelper.accessor('type', {
          header: t('transactions.type'),
          enableSorting: false,
          cell: (info) => (
            <Badge color={getTransactionTypeColor(info.getValue())}>
              {getTransactionTypeLabel(info.getValue())}
            </Badge>
          ),
        }),
        columnHelper.accessor('account.name', {
          header: t('transactions.account'),
          enableSorting: false,
          cell: (info) => (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {info.getValue()}
            </div>
          ),
        }),
        columnHelper.accessor('category.name', {
          header: t('transactions.category'),
          enableSorting: false,
          cell: (info) => {
            const category = info.row.original.category;
            if (!category) {
              return (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  -
                </div>
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
        }),
        columnHelper.accessor('amount', {
          header: t('transactions.amount'),
          enableSorting: true,
          cell: (info) => {
            const transaction = info.row.original;
            const amount = parseFloat(info.getValue());
            const isExpense = transaction.type === TransactionType.expense;
            const isIncome = transaction.type === TransactionType.income;
            const colorClass = isExpense
              ? 'text-red-600 dark:text-red-400'
              : isIncome
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100';
            const currencySymbol = transaction.account.currency.symbol || '';

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
        }),
        columnHelper.accessor('note', {
          header: t('transactions.description'),
          enableSorting: false,
          cell: (info) => {
            const note = info.getValue();
            if (!note) {
              return (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  -
                </div>
              );
            }
            return (
              <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                {note}
              </div>
            );
          },
        }),
      ] as ColumnDef<TransactionFull>[],
    [t],
  );

  return (
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
  );
};

export default TransactionTable;
