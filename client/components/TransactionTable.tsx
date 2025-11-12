import type { TransactionFull } from '@client/types/transaction';
import { ActionIcon, Badge, Box, NumberFormatter } from '@mantine/core';
import { TransactionType } from '@server/generated/prisma/enums';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';
import { getCategoryIcon, getCategoryLabel } from './utils/category';

type TransactionTableProps = {
  transactions: TransactionFull[];
  onEdit: (transaction: TransactionFull) => void;
  onDelete: (transaction: TransactionFull) => void;
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

  const columns = useMemo(
    (): DataTableColumn<TransactionFull>[] => [
      {
        accessor: 'date',
        title: 'transactions.date',
      },
      {
        accessor: 'type',
        title: 'transactions.type',
        render: (value: unknown, row: TransactionFull) => (
          <Badge color={getTransactionTypeColor(row.type)}>
            {getTransactionTypeLabel(row.type)}
          </Badge>
        ),
      },
      {
        accessor: (row) => row.account.name,
        title: 'transactions.account',
      },
      {
        accessor: (row) => row.category?.name,
        title: 'transactions.category',
        render: (value: unknown, row: TransactionFull) => {
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
        textAlign: 'right',
        render: (value: unknown, row: TransactionFull) => {
          const amount = parseFloat(String(row.amount));
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
        ellipsis: true,
      },
      {
        title: 'transactions.actions',
        textAlign: 'right',
        width: '8rem',
        render: (value: unknown, row: TransactionFull) => (
          <div className="flex items-center justify-end gap-2">
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
          </div>
        ),
      },
    ],
    [t, onEdit, onDelete],
  );

  return (
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
    />
  );
};

export default TransactionTable;
