import { usePermission } from '@client/hooks/usePermission';
import { Badge } from '@mantine/core';
import type { UserResponse } from '@server/dto/admin/user.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createActionColumn } from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';

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
      {
        accessor: 'username',
        title: 'users.username',
      },
      {
        accessor: 'name',
        title: 'users.name',
        ellipsis: true,
        render: (value, _row, _rowIndex) => {
          if (!value) {
            return <span className="text-gray-400">-</span>;
          }
          return value;
        },
      },
      {
        id: 'roles',
        title: 'users.role',
        accessor: (row: UserResponse) => row.roles || [],
        enableSorting: false,
        render: (roles: UserResponse['roles'], _row, _rowIndex) => {
          if (!roles || roles.length === 0) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role.id} variant="light" color="blue">
                  {role.title}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: 'baseCurrency',
        title: 'users.baseCurrency',
        accessor: (row: UserResponse) => row.baseCurrency?.code,
        enableSorting: false,
        render: (_value, row, _rowIndex) => {
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
      },
      {
        accessor: 'created',
        title: 'users.created',
      },
      createActionColumn({
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
