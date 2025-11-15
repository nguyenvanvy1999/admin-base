import { usePermission } from '@client/hooks/usePermission';
import { ActionIcon } from '@mantine/core';
import type { UserResponse } from '@server/dto/admin/user.dto';
import { UserRole } from '@server/generated';
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
      },
      {
        accessor: 'role',
        title: 'users.role',
        render: (value, row: UserResponse) => {
          if (!row.role) return <span className="text-gray-400">-</span>;
          const label =
            row.role === UserRole.admin
              ? t('users.roleAdmin')
              : row.role === UserRole.user
                ? t('users.roleUser')
                : row.role;
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {label}
            </span>
          );
        },
      },
      {
        accessor: 'baseCurrency',
        title: 'users.baseCurrency',
        render: (value, row: UserResponse) => {
          if (!row.baseCurrency)
            return <span className="text-gray-400">-</span>;
          return (
            <span>
              {row.baseCurrency.code}{' '}
              {row.baseCurrency.symbol ? `(${row.baseCurrency.symbol})` : ''}
            </span>
          );
        },
      },
      {
        accessor: 'createdAt',
        title: 'users.createdAt',
      },
      {
        title: 'users.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value, row: UserResponse) => (
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

export default UserTable;
