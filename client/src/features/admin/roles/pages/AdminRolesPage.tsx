import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Space, Tag, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { RoleFormModal } from 'src/features/admin/roles/components/RoleFormModal';
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
    {
      title: t('adminRolesPage.table.filters.user'),
      dataIndex: 'userId',
      hideInTable: true,
      valueType: 'text',
      fieldProps: {
        placeholder: t('adminRolesPage.table.filters.user'),
      },
    },
    {
      title: t('common.search'),
      dataIndex: 'search',
      hideInTable: true,
      valueType: 'text',
      fieldProps: {
        placeholder: t('common.search'),
      },
    },
    {
      title: t('adminRolesPage.table.actions'),
      dataIndex: 'actions',
      valueType: 'option',
      hideInTable: !canUpdate && !canDelete,
      width: 80,
      render: (_, record) => {
        const isProtected = Boolean(record.protected);
        return (
          <Space size="small">
            {canUpdate && !isProtected && (
              <Tooltip title={t('adminRolesPage.actions.edit')}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
            )}
            {canDelete && !isProtected && (
              <Tooltip title={t('adminRolesPage.actions.delete')}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
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
          const { userId, search } = params;
          const response = await adminRolesService.list({
            userId: userId?.trim() || undefined,
            search: search?.trim() || undefined,
          });
          return {
            data: response || [],
            success: true,
            total: response?.length || 0,
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
