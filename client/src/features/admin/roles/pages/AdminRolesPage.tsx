import type { ProColumns } from '@ant-design/pro-components';
import { App, Button, Modal, Tag, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  createActionColumn,
  createSearchColumn,
} from 'src/components/common/tableColumns';
import { useUserSearchSelect } from 'src/features/admin/users/hooks/useUserSearchSelect';
import { createUserSelectColumn } from 'src/features/admin/users/utils/userSelectColumn';
import { useAdminTable } from 'src/hooks/admin/useAdminTable';
import { useDeleteRoles } from 'src/hooks/api/useAdminRoles';
import { getSearchValue } from 'src/lib/utils/table.utils';
import {
  type AdminRoleListQuery,
  adminRolesService,
} from 'src/services/api/admin/roles.service';
import type { AdminRole } from 'src/types/admin';
import type { TableParamsWithFilters } from 'src/types/table';

type AdminRoleTableParams = TableParamsWithFilters<{
  userId?: string;
}>;

export default function AdminRolesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { actionRef, canView, canUpdate, canDelete, request } = useAdminTable<
    AdminRole,
    Omit<AdminRoleListQuery, 'skip' | 'take'>
  >({
    service: adminRolesService,
    permissions: {
      view: 'ROLE.VIEW',
      update: 'ROLE.UPDATE',
      delete: 'ROLE.DELETE',
    },
    normalizeParams: (params) => ({
      userId: getSearchValue(params.userId as string | undefined),
      search: getSearchValue(params.search),
    }),
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null);

  const deleteMutation = useDeleteRoles({
    onSuccess: () => {
      message.success(t('common.messages.deleteSuccess'));
      setDeleteModalOpen(false);
      setDeletingRole(null);
      actionRef.current?.reload();
    },
  });

  const handleDelete = (role: AdminRole) => {
    setDeletingRole(role);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingRole) {
      deleteMutation.mutate([deletingRole.id]);
    }
  };

  const userSearchSelect = useUserSearchSelect({
    enabled: true,
    take: 20,
  });

  const columns: ProColumns<AdminRole>[] = useMemo(
    () => [
      {
        title: t('common.fields.roleName'),
        dataIndex: 'title',
        copyable: true,
        ellipsis: true,
        hideInSearch: true,
      },
      {
        title: t('common.fields.description'),
        dataIndex: 'description',
        ellipsis: true,
        hideInSearch: true,
        render: (_, record) => record.description ?? '-',
      },
      {
        title: t('common.fields.permissionCount'),
        dataIndex: 'permissionIds',
        hideInSearch: true,
        render: (_, record) => (
          <Tag color="blue">{record.permissionIds.length}</Tag>
        ),
      },
      {
        title: t('common.fields.userCount'),
        dataIndex: 'players',
        hideInSearch: true,
        render: (_, record) => {
          const totalCount = record.totalPlayers ?? 0;
          const activeCount = record.activePlayers ?? 0;
          const expiredCount =
            record.expiredPlayers ?? Math.max(totalCount - activeCount, 0);

          return (
            <Tooltip
              title={t('adminRolesPage.users.tooltip' as any, {
                total: totalCount,
                active: activeCount,
                expired: expiredCount,
              })}
            >
              <Tag color="green">
                {totalCount} / {activeCount} / {expiredCount}
              </Tag>
            </Tooltip>
          );
        },
      },
      createUserSelectColumn<AdminRole>(userSearchSelect, t, {
        title: t('common.filters.user'),
        dataIndex: 'userId',
        placeholder: t('common.filters.user'),
        mode: undefined,
      }),
      createSearchColumn<AdminRole>({
        dataIndex: 'search',
        placeholder: t('common.search'),
      }),
      ...(canView || canUpdate || canDelete
        ? [
            createActionColumn<AdminRole>({
              onView: (record) => {
                navigate(`/admin/roles/${record.id}`);
              },
              onEdit: (record) => {
                if (canUpdate && !record.protected) {
                  navigate(`/admin/roles/${record.id}`);
                }
              },
              onDelete: (record) => {
                if (canDelete && !record.protected) {
                  handleDelete(record);
                }
              },
              canView: () => canView,
              canEdit: (record) => canUpdate && !record.protected,
              canDelete: (record) => canDelete && !record.protected,
              viewTooltip: t('common.actions.view'),
              editTooltip: t('common.actions.edit'),
              deleteTooltip: t('common.actions.delete'),
              title: t('common.fields.actions'),
            }),
          ]
        : []),
    ],
    [t, canView, canUpdate, canDelete, userSearchSelect, handleDelete],
  );

  if (!canView) {
    return null;
  }

  return (
    <AppPage>
      <AppTable<AdminRole, AdminRoleTableParams>
        rowKey="id"
        columns={columns}
        actionRef={actionRef}
        search={{
          labelWidth: 'auto',
        }}
        request={request as any}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => t('common.pagination.total', { total }),
        }}
        toolBarRender={() =>
          canUpdate
            ? [
                <Button
                  key="create"
                  type="primary"
                  onClick={() => navigate('/admin/roles/new')}
                >
                  {t('common.actions.create')}
                </Button>,
              ]
            : []
        }
      />

      <Modal
        open={deleteModalOpen}
        title={t('adminRolesPage.delete.title')}
        onOk={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletingRole(null);
        }}
        confirmLoading={deleteMutation.isPending}
        okText={t('adminRolesPage.delete.confirm')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
      >
        <p>{t('adminRolesPage.delete.message')}</p>
        {deletingRole && (
          <p>
            <strong>{deletingRole.title}</strong>
          </p>
        )}
      </Modal>
    </AppPage>
  );
}
