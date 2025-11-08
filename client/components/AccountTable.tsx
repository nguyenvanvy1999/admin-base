import { AccountType } from '@server/generated/prisma/enums';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type Account = {
  id: string;
  type: string;
  name: string;
  currencyId: string;
  balance: string;
  creditLimit: string | null;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
  };
};

type AccountTableProps = {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  isLoading?: boolean;
};

const columnHelper = createColumnHelper<Account>();

const AccountTable = ({
  accounts,
  onEdit,
  onDelete,
  isLoading = false,
}: AccountTableProps) => {
  const { t } = useTranslation();

  const formatCurrency = (value: string, symbol: string | null) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return `${symbol || ''}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

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
    () => [
      columnHelper.accessor('name', {
        header: t('accounts.name'),
        cell: (info) => (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: t('accounts.type'),
        cell: (info) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {getAccountTypeLabel(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('currency.code', {
        header: t('accounts.currency'),
        cell: (info) => (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('balance', {
        header: t('accounts.balance'),
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
      columnHelper.display({
        id: 'actions',
        header: t('accounts.actions'),
        cell: (info) => {
          const account = info.row.original;
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(account);
                }}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                aria-label={t('common.edit')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(account);
                }}
                className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                aria-label={t('common.delete')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          );
        },
      }),
    ],
    [t, onEdit, onDelete],
  );

  const table = useReactTable({
    data: accounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                {table.getHeaderGroups()[0]?.headers.map((header) => (
                  <td key={header.id} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {t('accounts.noAccounts')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => onEdit(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountTable;
