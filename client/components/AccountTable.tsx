import type { AccountFull } from '@client/types/account';
import { AccountType } from '@server/generated/prisma/enums';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, { type DataTableProps } from './DataTable';
import { formatCurrency } from './utils/currency';

type AccountTableProps = {
  accounts: AccountFull[];
  onEdit: (account: AccountFull) => void;
  onDelete: (account: AccountFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<AccountFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

const columnHelper = createColumnHelper<AccountFull>();

const AccountTable = ({
  accounts,
  onEdit,
  onDelete,
  isLoading = false,
  search,
  pageSize,
  filters,
  pagination,
  sorting,
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
    () =>
      [
        columnHelper.accessor('name', {
          header: t('accounts.name'),
          enableSorting: true,
          cell: (info) => (
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {info.getValue()}
            </div>
          ),
        }),
        columnHelper.accessor('type', {
          header: t('accounts.type'),
          enableSorting: false,
          cell: (info) => (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {getAccountTypeLabel(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('currency.code', {
          header: t('accounts.currency'),
          enableSorting: false,
          cell: (info) => (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {info.getValue()}
            </div>
          ),
        }),
        columnHelper.accessor('balance', {
          header: t('accounts.balance'),
          enableSorting: true,
          cell: (info) => {
            const account = info.row.original;
            return (
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(info.getValue(), account.currency.symbol)}
              </div>
            );
          },
        }),
        columnHelper.accessor('creditLimit', {
          header: t('accounts.creditLimit'),
          enableSorting: false,
          cell: (info) => {
            const account = info.row.original;
            const value = info.getValue();
            return (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {value ? formatCurrency(value, account.currency.symbol) : '-'}
              </div>
            );
          },
        }),
      ] as ColumnDef<AccountFull>[],
    [t],
  );

  return (
    <DataTable
      data={accounts}
      columns={columns}
      isLoading={isLoading}
      actions={{
        onEdit,
        onDelete,
        headerLabel: t('accounts.actions'),
      }}
      onRowClick={onEdit}
      emptyMessage={t('accounts.noAccounts')}
      search={search}
      pageSize={pageSize}
      filters={filters}
      pagination={pagination}
      sorting={sorting}
    />
  );
};

export default AccountTable;
