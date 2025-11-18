import { usePermission } from '@client/hooks/usePermission';
import type { UserResponse } from '@server/dto/admin/user.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createActionColumn } from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { createArrayColumn, createTextColumn } from './factories';

type UserTableProps = {
  users: UserResponse[];
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
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

const UserTable = ({
  users,
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
}: UserTableProps) => {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();

  const canUpdate = hasPermission('USER.UPDATE');
  const canDelete = hasPermission('USER.DELETE');

  const columns = useMemo(
    (): DataTableColumn<UserResponse>[] => [
      // Simple text column with type-safe accessor
      createTextColumn({
        accessor: 'username',
        title: 'users.username',
      }),
      // Text column with ellipsis and empty value handling
      createTextColumn({
        accessor: 'name',
        title: 'users.name',
        ellipsis: true,
        emptyValue: '-',
      }),
      // Array column with badges - much cleaner!
      createArrayColumn<UserResponse, any, { id: string; title: string }>({
        id: 'roles',
        accessor: (row) => row.roles || [],
        title: 'users.role',
        getLabel: (role) => role.title,
        variant: 'badge',
        badgeVariant: 'light',
        getColor: () => 'blue',
        emptyValue: '-',
        enableSorting: false,
      }),
      // Custom render for complex nested data
      {
        id: 'baseCurrency',
        title: 'users.baseCurrency',
        accessor: 'baseCurrency.code' as any,
        enableSorting: false,
        render: (_value: any, row: UserResponse) => {
          const currency = row.baseCurrency;
          if (!currency) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <span>
              {currency.code} {currency.symbol ? `(${currency.symbol})` : ''}
            </span>
          );
        },
      } as DataTableColumn<UserResponse>,
      // Date column
      createTextColumn({
        accessor: 'created',
        title: 'users.created',
      }),
      // Action column with permission checks
      createActionColumn<UserResponse>({
        title: 'users.actions',
        onEdit: canUpdate ? onEdit : undefined,
        onDelete: canDelete ? onDelete : undefined,
      }),
    ],
    [t, onEdit, onDelete, canUpdate, canDelete],
  );

  return (
    <DataTable
      data={users}
      columns={columns}
      loading={isLoading}
      enableRowNumbers={showIndexColumn}
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

export default UserTable;
