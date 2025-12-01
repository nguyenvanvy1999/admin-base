import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { AdminUserCreateModal } from 'src/features/admin/users/components/AdminUserCreateModal';
import { AdminUserDetailDrawer } from 'src/features/admin/users/components/AdminUserDetailDrawer';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminUsersService } from 'src/services/api/admin-users.service';
import {
  ADMIN_USER_STATUSES,
  type AdminUserStatus,
  type AdminUserSummary,
} from 'src/types/admin-users';

type AdminUserTableParams = {
  current?: number;
  pageSize?: number;
  email?: string;
  status?: AdminUserStatus;
  roleId?: string;
};

function formatStatus(status: AdminUserStatus): string {
  return status.toUpperCase();
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const actionRef = useRef<ActionType>();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('USER.UPDATE');
  const canManageMfa = hasPermission('USER.RESET_MFA');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'general' | 'security' | 'edit'>(
    'general',
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statusValueEnum = useMemo(() => {
    return ADMIN_USER_STATUSES.reduce(
      (acc, status) => ({
        ...acc,
        [status]: { text: formatStatus(status) },
      }),
      {} as Record<string, { text: string }>,
    );
  }, []);

  const columns: ProColumns<AdminUserSummary>[] = [
    {
      title: t('adminUsersPage.table.email'),
      dataIndex: 'email',
      copyable: true,
      ellipsis: true,
    },
    {
      title: t('adminUsersPage.table.name'),
      dataIndex: 'name',
      render: (_, record) => record.name ?? '-',
    },
    {
      title: t('adminUsersPage.table.status'),
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      render: (_, record) => (
        <Tag color={record.status === 'active' ? 'green' : 'default'}>
          {formatStatus(record.status)}
        </Tag>
      ),
    },
    {
      title: t('adminUsersPage.table.emailVerified'),
      dataIndex: 'emailVerified',
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.emailVerified ? 'green' : 'red'}>
          {record.emailVerified ? t('common.enabled') : t('common.disabled')}
        </Tag>
      ),
    },
    {
      title: t('adminUsersPage.table.roles'),
      dataIndex: 'roles',
      hideInSearch: true,
      render: (_, record) => (
        <Space wrap>
          {record.roles.map((role) => (
            <Tag key={`${record.id}-${role.roleId}`}>{role.roleId}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('adminUsersPage.table.created'),
      dataIndex: 'created',
      hideInSearch: true,
      render: (_, record) => dayjs(record.created).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('adminUsersPage.table.filters.role'),
      dataIndex: 'roleId',
      hideInTable: true,
      valueType: 'text',
    },
    {
      title: t('adminUsersPage.table.actions'),
      dataIndex: 'actions',
      valueType: 'option',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => {
              setDetailUserId(record.id);
              setDetailTab('general');
              setDrawerOpen(true);
            }}
          >
            {t('adminUsersPage.actions.view')}
          </Button>
          {canUpdate && (
            <Button
              type="link"
              onClick={() => {
                setDetailUserId(record.id);
                setDetailTab('edit');
                setDrawerOpen(true);
              }}
            >
              {t('adminUsersPage.actions.edit')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleReload = () => {
    actionRef.current?.reload();
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setDetailUserId(null);
    setDetailTab('general');
  };

  return (
    <AppPage
      title={t('adminUsersPage.title')}
      subtitle={t('adminUsersPage.subtitle')}
    >
      <AppTable<AdminUserSummary, AdminUserTableParams>
        rowKey="id"
        columns={columns}
        actionRef={actionRef}
        search={{
          labelWidth: 'auto',
        }}
        request={async (params) => {
          const { current = 1, pageSize = 20, email, status, roleId } = params;
          const take = pageSize;
          const skip = (current - 1) * pageSize;
          const response = await adminUsersService.list({
            skip,
            take,
            email: email?.trim() || undefined,
            status,
            roleId: roleId?.trim() || undefined,
          });
          return {
            data: response.docs,
            success: true,
            total: response.count,
          };
        }}
        toolBarRender={() =>
          canUpdate
            ? [
                <Button
                  key="create"
                  type="primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  {t('adminUsersPage.create.button')}
                </Button>,
              ]
            : []
        }
      />

      <AdminUserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          handleReload();
        }}
      />

      <AdminUserDetailDrawer
        open={drawerOpen}
        userId={detailUserId}
        canUpdate={canUpdate}
        canManageMfa={canManageMfa}
        onClose={handleCloseDrawer}
        onActionCompleted={handleReload}
        initialTab={detailTab}
      />
    </AppPage>
  );
}
