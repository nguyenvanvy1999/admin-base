import type { AccountResponse } from '@server/dto/account.dto';
import { AccountType } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createActionColumn,
  createCurrencyColumn,
  createDateColumn,
  createTextColumn,
  createTypeColumn,
} from './columnFactories';
import { renderCurrency } from './columnRenderers';
import { DataTable, type DataTableColumn } from './DataTable';
import type { SortingState } from './types';

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
      createTextColumn<AccountResponse, 'name'>({
        accessor: 'name',
        title: 'accounts.name',
        enableSorting: true,
      }),
      createTypeColumn<AccountResponse, 'type'>({
        accessor: 'type',
        title: 'accounts.type',
        enableSorting: false,
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
        accessor: (row: AccountResponse) => row.currency?.code ?? '',
        title: 'accounts.currency',
        enableSorting: false,
      },
      createCurrencyColumn<AccountResponse, 'balance'>({
        accessor: 'balance',
        title: 'accounts.balance',
        enableSorting: true,
        getSymbol: (row: AccountResponse) => row.currency?.symbol,
        decimalScale: 2,
        allowNegative: true,
        getColor: (balance, row) => {
          const numBalance = parseFloat(String(balance));
          return numBalance < 0 ? 'red' : 'green';
        },
      }),
      {
        accessor: 'creditLimit',
        title: 'accounts.creditLimit',
        enableSorting: false,
        render: (value, row) => {
          if (!value) return null;
          return renderCurrency({
            value: parseFloat(String(value)),
            symbol: row.currency?.symbol || undefined,
            decimalScale: 2,
          });
        },
      },
      createDateColumn<AccountResponse, 'created'>({
        accessor: 'created',
        title: 'common.created',
        enableSorting: true,
        format: 'YYYY-MM-DD HH:mm',
      }),
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
