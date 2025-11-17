import type { AccountResponse } from '@server/dto/account.dto';
import { AccountType } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SortingState } from '@/components';
import { renderCurrency } from '@/components/tables/columnRenderers';
import {
  createActionColumn,
  createCurrencyColumn,
  createTypeColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';

type AccountTableProps = {
  accounts: AccountResponse[];
  onEdit: (account: AccountResponse) => void;
  onDelete: (account: AccountResponse) => void;
  isLoading?: boolean;
  showIndexColumn?: boolean;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: SortingState;
  onSortingChange?: (
    updater: SortingState | ((prev: SortingState) => SortingState),
  ) => void;
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

  const columns = useMemo(
    (): DataTableColumn<AccountResponse>[] => [
      {
        accessor: 'name',
        title: 'accounts.name',
        enableSorting: true,
      },
      createTypeColumn<AccountResponse>({
        accessor: 'type',
        title: 'accounts.type',
        enableSorting: false,
        getType: (row) => row.type,
        labelMap: {
          [AccountType.cash]: t('accounts.cash'),
          [AccountType.bank]: t('accounts.bank'),
          [AccountType.credit_card]: t('accounts.credit_card'),
          [AccountType.investment]: t('accounts.investment'),
        },
        colorMap: {
          [AccountType.cash]: 'blue',
          [AccountType.bank]: 'green',
          [AccountType.credit_card]: 'orange',
          [AccountType.investment]: 'purple',
        },
      }),
      {
        accessor: (row) => row.currency?.code ?? '',
        title: 'accounts.currency',
        enableSorting: false,
      },
      createCurrencyColumn<AccountResponse>({
        accessor: 'balance',
        title: 'accounts.balance',
        enableSorting: true,
        getValue: (row) => parseFloat(String(row.balance)),
        getSymbol: (row) => row.currency?.symbol,
        decimalScale: 2,
        allowNegative: true,
        getColor: (row) => {
          const balance = parseFloat(String(row.balance));
          return balance < 0 ? 'red' : 'green';
        },
      }),
      {
        accessor: 'creditLimit',
        title: 'accounts.creditLimit',
        enableSorting: false,
        render: (value, row: AccountResponse) => {
          if (!row.creditLimit) return null;
          return renderCurrency({
            value: parseFloat(String(row.creditLimit)),
            symbol: row.currency?.symbol || undefined,
            decimalScale: 2,
          });
        },
      },
      {
        accessor: 'created',
        title: 'common.created',
        enableSorting: true,
      },
      createActionColumn<AccountResponse>({
        title: 'accounts.actions',
        onEdit,
        onDelete,
      }),
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
