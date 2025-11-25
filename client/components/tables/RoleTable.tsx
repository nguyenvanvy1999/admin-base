import type { RoleResponse } from '@server/dto/admin/role.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createBooleanColumn,
  createCountColumn,
  createDateColumn,
  createTextColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { useCreatePermissionActionColumn } from './hooks/usePermissionActionColumn';

const FROZEN_ROLE_IDS = ['role_user_default', 'role_admin_default'];

function isFrozenRole(roleId: string): boolean {
  return FROZEN_ROLE_IDS.includes(roleId);
}

type RoleTableProps = {
  roles: RoleResponse[];
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
  onDeleteMany?: (roles: RoleResponse[]) => void;
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
  selectedRecords?: RoleResponse[];
  onSelectedRecordsChange?: (records: RoleResponse[]) => void;
};

const RoleTable = ({
  roles,
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
  selectedRecords,
  onSelectedRecordsChange,
}: RoleTableProps) => {
  const { t } = useTranslation();

  const actionColumn = useCreatePermissionActionColumn<RoleResponse>({
    title: 'roles.actions',
    onEdit: (row) => {
      if (!isFrozenRole(row.id)) {
        onEdit(row);
      }
    },
    onDelete: (row) => {
      if (!isFrozenRole(row.id)) {
        onDelete(row);
      }
    },
    editPermission: 'ROLE.UPDATE',
    deletePermission: 'ROLE.DELETE',
  });

  const columns = useMemo(
    (): DataTableColumn<RoleResponse>[] => [
      createTextColumn<RoleResponse, 'title'>({
        accessor: 'title',
        title: 'roles.roleTitle',
      }),
      createTextColumn<RoleResponse, 'description'>({
        accessor: 'description',
        title: 'roles.description',
        ellipsis: true,
      }),
      createBooleanColumn<RoleResponse, 'enabled'>({
        accessor: 'enabled',
        title: 'roles.enabled',
        trueLabel: t('common.enabled'),
        falseLabel: t('common.disabled'),
        trueColor: 'green',
        falseColor: 'red',
      }),
      createCountColumn<RoleResponse, 'permissionIds'>({
        accessor: 'permissionIds',
        title: 'roles.permissions',
      }),
      createCountColumn<RoleResponse, 'playerIds'>({
        accessor: 'playerIds',
        title: 'roles.players',
      }),
      createDateColumn<RoleResponse, 'created'>({
        accessor: 'created',
        title: 'roles.created',
      }),
      actionColumn,
    ],
    [t, actionColumn],
  );

  return (
    <DataTable
      data={roles}
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
      selectedRecords={selectedRecords}
      onSelectedRecordsChange={onSelectedRecordsChange}
    />
  );
};

export default RoleTable;
