import type { UserResponse } from '@server/dto/admin/user.dto';
import { useMemo } from 'react';
import {
  createArrayBadgeColumn,
  createCurrencyDisplayColumn,
  createDateColumn,
  createTextColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { useCreatePermissionActionColumn } from './hooks/usePermissionActionColumn';

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
  const actionColumn = useCreatePermissionActionColumn<UserResponse>({
    title: 'users.actions',
    onEdit,
    onDelete,
    editPermission: 'USER.UPDATE',
    deletePermission: 'USER.DELETE',
  });

  const columns = useMemo(
    (): DataTableColumn<UserResponse>[] => [
      createTextColumn<UserResponse, 'username'>({
        accessor: 'username',
        title: 'users.username',
      }),
      createTextColumn<UserResponse, 'name'>({
        accessor: 'name',
        title: 'users.name',
        ellipsis: true,
      }),
      createArrayBadgeColumn<
        UserResponse,
        (row: UserResponse) => UserResponse['roles']
      >({
        id: 'roles',
        title: 'users.role',
        accessor: (row) => row.roles || [],
        enableSorting: false,
        enableGrouping: false,
        getLabel: (role) => role.title || role.id || '',
        getKey: (role) => role.id,
        getColor: () => 'blue',
        variant: 'light',
      }),
      createCurrencyDisplayColumn<
        UserResponse,
        (row: UserResponse) => string | undefined
      >({
        id: 'baseCurrency',
        title: 'users.baseCurrency',
        accessor: (row: UserResponse) => row.baseCurrency?.code,
        enableSorting: false,
        getSymbol: (row) => row.baseCurrency?.symbol,
      }),
      createDateColumn<UserResponse, 'created'>({
        accessor: 'created',
        title: 'users.created',
      }),
      actionColumn,
    ],
    [actionColumn],
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
