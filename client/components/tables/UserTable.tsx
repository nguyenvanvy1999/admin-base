import { usePermission } from '@client/hooks/usePermission';
import { ActionIcon } from '@mantine/core';
import type { UserResponse } from '@server/dto/admin/user.dto';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
        render: (value) => {
          const name = (value as string) || '';
          if (!name) {
            return <span className="text-gray-400">-</span>;
          }
          return name;
        },
      },
      {
        id: 'roles',
        title: 'users.role',
        accessor: (row) => (row.roles || []).map((r) => r.title).join(', '),
        enableSorting: false,
        enableGrouping: false,
        render: (_value, row) => {
          const roles = row.roles;
          if (!roles || roles.length === 0) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {role.title}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: 'baseCurrency',
        title: 'users.baseCurrency',
        accessor: 'baseCurrency.code',
        enableSorting: false,
        render: (_value, row) => {
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
      {
        title: 'users.actions',
        textAlign: 'center',
        width: '8rem',
        render: (_value, row: UserResponse) => (
          <div className="flex items-center justify-center gap-2">
            {canUpdate && (
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
            )}
            {canDelete && (
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
            )}
          </div>
        ),
      },
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
