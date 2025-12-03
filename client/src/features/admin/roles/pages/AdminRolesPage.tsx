import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Tag, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { createActionColumn } from 'src/components/common/tableColumns';
import { RoleFormModal } from 'src/features/admin/roles/components/RoleFormModal';
import { useUserSearchSelect } from 'src/features/admin/users/hooks/useUserSearchSelect';
import { createUserSelectColumn } from 'src/features/admin/users/utils/userSelectColumn';
import { useDeleteRoles, useUpsertRole } from 'src/hooks/api/useAdminRoles';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { useNotify } from 'src/hooks/useNotify';
import { adminRolesService } from 'src/services/api/admin-roles.service';
import type { AdminRole } from 'src/types/admin-roles';

type AdminRoleTableParams = {
  current?: number;
  pageSize?: number;
  userId?: string;
  search?: string;
};

export default function AdminRolesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const actionRef = useRef<ActionType | null>(null);
  const { hasPermission } = usePermissions();
  const canView = hasPermission('ROLE.VIEW');
  const canUpdate = hasPermission('ROLE.UPDATE');
  const canDelete = hasPermission('ROLE.DELETE');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null);

  const upsertMutation = useUpsertRole({
    onSuccess: () => {
      notify.success(t('adminRolesPage.upsert.success'));
      setFormModalOpen(false);
      setEditingRole(null);
      actionRef.current?.reload();
    },
  });

  const deleteMutation = useDeleteRoles({
    onSuccess: () => {
      notify.success(t('adminRolesPage.delete.success'));
      setDeleteModalOpen(false);
      setDeletingRole(null);
      actionRef.current?.reload();
    },
  });

  const handleEdit = (role: AdminRole) => {
    setEditingRole(role);
    setFormModalOpen(true);
  };

  const handleDelete = (role: AdminRole) => {
    setDeletingRole(role);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingRole) {
      deleteMutation.mutate([deletingRole.id]);
    }
  };

  const handleFormClose = () => {
    setFormModalOpen(false);
    setEditingRole(null);
  };

  const userSearchSelect = useUserSearchSelect({
    enabled: true,
    take: 20,
  });

  const columns: ProColumns<AdminRole>[] = [
    {
      title: t('adminRolesPage.table.title'),
      dataIndex: 'title',
      copyable: true,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('adminRolesPage.table.description'),
      dataIndex: 'description',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.description ?? '-',
    },
    {
      title: t('adminRolesPage.table.permissions'),
      dataIndex: 'permissionIds',
      hideInSearch: true,
      render: (_, record) => (
        <Tag color="blue">{record.permissionIds.length}</Tag>
      ),
    },
    {
      title: t('adminRolesPage.table.users'),
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
    createUserSelectColumn<AdminRole>(userSearchSelect, {
      title: t('adminRolesPage.table.filters.user'),
      dataIndex: 'userId',
      placeholder: t('adminRolesPage.table.filters.user'),
      mode: undefined,
    }),
    {
      title: t('common.search'),
      dataIndex: 'search',
      hideInTable: true,
      valueType: 'text',
      fieldProps: {
        placeholder: t('common.search'),
      },
    },
    ...(canView || canUpdate || canDelete
      ? [
          createActionColumn<AdminRole>({
            onView: (record) => {
              navigate(`/admin/roles/${record.id}`);
            },
            onEdit: (record) => {
              if (canUpdate && !record.protected) {
                handleEdit(record);
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
            deleteTooltip: t('adminRolesPage.actions.delete'),
            title: t('common.table.actions'),
          }),
        ]
      : []),
  ];

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
        request={async (params) => {
          const { current = 1, pageSize = 20, userId, search } = params;
          const skip = (current - 1) * pageSize;
          const response = await adminRolesService.list({
            skip,
            take: pageSize,
            userId: userId?.trim() || undefined,
            search: search?.trim() || undefined,
          });
          return {
            data: response.docs || [],
            success: true,
            total: response.count || 0,
          };
        }}
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
                  onClick={() => setFormModalOpen(true)}
                >
                  {t('adminRolesPage.create.button')}
                </Button>,
              ]
            : []
        }
      />

      <RoleFormModal
        open={formModalOpen}
        role={editingRole}
        onClose={handleFormClose}
        onSubmit={async (data) => {
          await upsertMutation.mutateAsync(data);
        }}
        loading={upsertMutation.isPending}
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
