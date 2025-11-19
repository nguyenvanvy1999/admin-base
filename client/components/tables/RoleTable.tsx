import { usePermission } from '@client/hooks/usePermission';
import { ActionIcon, Badge } from '@mantine/core';
import type { RoleResponse } from '@server/dto/admin/role.dto';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { renderEmpty } from './columnRenderers';
import { DataTable, type DataTableColumn } from './DataTable';

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
  const { hasPermission } = usePermission();

  const canUpdate = hasPermission('ROLE.UPDATE');
  const canDelete = hasPermission('ROLE.DELETE');

  const columns = useMemo(
    (): DataTableColumn<RoleResponse>[] => [
      {
        accessor: 'title',
        title: 'roles.roleTitle',
      },
      {
        accessor: 'description',
        title: 'roles.description',
        ellipsis: true,
        render: ({ value }) => {
          if (!value) return renderEmpty();
          return <span>{String(value)}</span>;
        },
      },
      {
        accessor: 'enabled',
        title: 'roles.enabled',
        render: ({ value }) => {
          return (
            <Badge color={value ? 'green' : 'red'} variant="light">
              {value ? t('common.enabled') : t('common.disabled')}
            </Badge>
          );
        },
      },
      {
        accessor: 'permissionIds',
        title: 'roles.permissions',
        render: ({ value }) => {
          return <span>{value.length}</span>;
        },
      },
      {
        accessor: 'playerIds',
        title: 'roles.players',
        render: ({ value }) => {
          return <span>{value.length}</span>;
        },
      },
      {
        accessor: 'created',
        title: 'roles.created',
      },
      {
        title: 'roles.actions',
        textAlign: 'center',
        width: '8rem',
        render: ({ row }) => {
          const frozen = isFrozenRole(row.id);
          const canEdit = canUpdate && !frozen;
          const canDeleteRole = canDelete && !frozen;

          return (
            <div className="flex items-center justify-center gap-2">
              {canEdit && (
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
              {canDeleteRole && (
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
          );
        },
      },
    ],
    [t, onEdit, onDelete, canUpdate, canDelete],
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
