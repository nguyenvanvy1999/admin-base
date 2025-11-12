import type { AccountFull } from '@client/types/account';
import { ActionIcon, NumberFormatter } from '@mantine/core';
import { AccountType } from '@server/generated/prisma/enums';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';

type AccountTableProps = {
  accounts: AccountFull[];
  onEdit: (account: AccountFull) => void;
  onDelete: (account: AccountFull) => void;
  isLoading?: boolean;
  showIndexColumn?: boolean;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: { id: string; desc: boolean }[];
  onSortingChange?: (updater: { id: string; desc: boolean }[]) => void;
};

const AccountTable = ({
  accounts,
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
}: AccountTableProps) => {
  const { t } = useTranslation();

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case AccountType.cash:
        return t('accounts.cash');
      case AccountType.bank:
        return t('accounts.bank');
      case AccountType.credit_card:
        return t('accounts.credit_card');
      case AccountType.investment:
        return t('accounts.investment');
      default:
        return type;
    }
  };

  const columns = useMemo(
    (): DataTableColumn<AccountFull>[] => [
      {
        accessor: 'name',
        title: 'accounts.name',
      },
      {
        accessor: 'type',
        title: 'accounts.type',
        render: (row) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {getAccountTypeLabel(row.type)}
          </span>
        ),
      },
      {
        accessor: (row) => row.currency.code,
        title: 'accounts.currency',
      },
      {
        accessor: 'balance',
        title: 'accounts.balance',
        textAlign: 'right',
        render: (row) => {
          const balance = parseFloat(String(row.balance));
          const isNegative = balance < 0;
          const colorClass = isNegative
            ? 'text-red-600 dark:text-red-400'
            : 'text-green-600 dark:text-green-400';
          const currencySymbol = row.currency.symbol || '';

          return (
            <div className={`text-sm font-medium ${colorClass}`}>
              <NumberFormatter
                value={balance}
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
        accessor: 'creditLimit',
        title: 'accounts.creditLimit',
        textAlign: 'right',
        render: (row) => {
          if (!row.creditLimit) return null;
          const currencySymbol = row.currency.symbol || '';
          return (
            <NumberFormatter
              value={parseFloat(String(row.creditLimit))}
              prefix={currencySymbol ? `${currencySymbol} ` : ''}
              thousandSeparator=","
              decimalScale={2}
            />
          );
        },
      },
      {
        title: 'accounts.actions',
        textAlign: 'right',
        width: '8rem',
        render: (row) => (
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
      data={accounts}
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

export default AccountTable;
