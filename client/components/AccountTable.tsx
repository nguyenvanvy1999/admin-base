import type { AccountFull } from '@client/types/account';
import { AccountType } from '@server/generated/prisma/enums';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, {
  type DataTableColumn,
  type DataTableProps,
} from './DataTable';

type AccountTableProps = {
  accounts: AccountFull[];
  onEdit: (account: AccountFull) => void;
  onDelete: (account: AccountFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<AccountFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

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
    (): DataTableColumn<AccountFull>[] => [
      {
        accessor: 'name',
        title: 'accounts.name',
        enableSorting: true,
      },
      {
        accessor: 'type',
        title: 'accounts.type',
        enableSorting: false,
        render: (value) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {getAccountTypeLabel(value)}
          </span>
        ),
      },
      {
        accessor: 'currency.code',
        title: 'accounts.currency',
        enableSorting: false,
      },
      {
        accessor: 'balance',
        title: 'accounts.balance',
        enableSorting: true,
        format: 'currency',
        currency: (row) => row.currency.symbol || null,
        numberFormat: {
          decimalScale: 2,
          thousandSeparator: ',',
        },
      },
      {
        accessor: 'creditLimit',
        title: 'accounts.creditLimit',
        enableSorting: false,
        format: 'currency',
        currency: (row) => row.currency.symbol || null,
        numberFormat: {
          decimalScale: 2,
          thousandSeparator: ',',
        },
      },
    ],
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
