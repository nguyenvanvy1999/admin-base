import { usePermission } from '@client/hooks/usePermission';
import { Badge } from '@mantine/core';
import type { UserResponse } from '@server/dto/admin/user.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createActionColumn } from './columnFactories';
import { renderEmpty } from './columnRenderers';
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
        render: ({ value }) => {
          if (!value) {
            return renderEmpty();
          }
          return value;
        },
      },
      {
        id: 'roles',
        title: 'users.role',
        accessor: (row) => row.roles.map((role) => role.title).join(', ') || [],
        enableSorting: false,
        enableGrouping: false,
        render: ({ row }: { row: UserResponse }) => {
          const roles = row.roles || [];
          if (!roles || roles.length === 0) {
            return renderEmpty();
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => {
                if (!role || typeof role !== 'object') {
                  return null;
                }
                const roleTitle = role.title || role.id || '';
                return (
                  <Badge key={role.id} variant="light" color="blue">
                    {String(roleTitle)}
                  </Badge>
                );
              })}
            </div>
          );
        },
      },
      {
        id: 'baseCurrency',
        title: 'users.baseCurrency',
        accessor: (row: UserResponse) => row.baseCurrency?.code,
        enableSorting: false,
        render: ({ row }: { row: UserResponse }) => {
          const currency = row.baseCurrency;
          if (!currency) {
            return renderEmpty();
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
