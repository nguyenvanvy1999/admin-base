import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ADMIN_USER_STATUS_COLORS } from 'src/components/common/AppAdminUserStatusSelect';
import { AppEnumMultiSelect } from 'src/components/common/AppEnumMultiSelect';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  createActionColumn,
  createDateColumn,
  createSearchColumn,
} from 'src/components/common/tableColumns';
import { useAdminRoles } from 'src/hooks/api/useAdminRoles';
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
  search?: string;
  statuses?: AdminUserStatus[];
  roleIds?: string[];
};

function formatStatus(status: AdminUserStatus): string {
  return status.toUpperCase();
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const actionRef = useRef<ActionType | null>(null);
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('USER.UPDATE');
  const { data: adminRolesResponse, isLoading: rolesLoading } = useAdminRoles();

  const roleOptions = useMemo(
    () =>
      (adminRolesResponse?.docs ?? []).map((role) => ({
        label: role.title || role.id,
        value: role.id,
      })),
    [adminRolesResponse],
  );

  const columns: ProColumns<AdminUserSummary>[] = [
    createSearchColumn<AdminUserSummary>({
      dataIndex: 'search',
      placeholder: t('adminUsersPage.table.filters.keyword'),
    }),
    {
      title: t('adminUsersPage.table.email'),
      dataIndex: 'email',
      copyable: true,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('adminUsersPage.table.name'),
      dataIndex: 'name',
      render: (_, record) => record.name ?? '-',
      hideInSearch: true,
    },
    {
      title: t('common.table.status'),
      dataIndex: 'statuses',
      valueType: 'select',
      width: 100,
      renderFormItem: () => (
        <AppEnumMultiSelect
          keys={[...ADMIN_USER_STATUSES]}
          colorMap={ADMIN_USER_STATUS_COLORS}
          i18nPrefix="adminUsersPage.statuses"
          placeholder={t('adminUsersPage.table.filters.status')}
          style={{ width: '100%' }}
        />
      ),
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
      width: 120,
      render: (_, record) => (
        <Tag color={record.emailVerified ? 'green' : 'red'}>
          {record.emailVerified ? t('common.enabled') : t('common.disabled')}
        </Tag>
      ),
    },
    {
      title: t('adminUsersPage.table.sessions'),
      dataIndex: 'sessionStats',
      hideInSearch: true,
      width: 320,
      render: (_, record) => {
        const { sessionStats } = record;
        return (
          <Tooltip
            title={
              <>
                <div>
                  {t('adminUsersPage.sessionStats.total')}: {sessionStats.total}
                </div>
                <div>
                  {t('adminUsersPage.sessionStats.active')}:{' '}
                  {sessionStats.active}
                </div>
                <div>
                  {t('adminUsersPage.sessionStats.revoked')}:{' '}
                  {sessionStats.revoked}
                </div>
                <div>
                  {t('adminUsersPage.sessionStats.expired')}:{' '}
                  {sessionStats.expired}
                </div>
              </>
            }
          >
            <Space size="small">
              <Tag color="blue">
                {t('adminUsersPage.sessionStats.total')}: {sessionStats.total}
              </Tag>
              <Tag color="green">
                {t('adminUsersPage.sessionStats.active')}: {sessionStats.active}
              </Tag>
              <Tag color="red">
                {t('adminUsersPage.sessionStats.revoked')}:{' '}
                {sessionStats.revoked}
              </Tag>
              <Tag color="default">
                {t('adminUsersPage.sessionStats.expired')}:{' '}
                {sessionStats.expired}
              </Tag>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: t('adminUsersPage.table.rolesWithExpiry'),
      dataIndex: 'roles',
      hideInSearch: true,
      render: (_, record) => (
        <Space wrap>
          {record.roles.map((roleRef) => {
            const expiresAt = roleRef.expiresAt;
            let color: string = 'default';
            let statusLabel = t('adminUsersPage.roleExpiry.noExpiry');
            let isExpired = false;

            if (expiresAt) {
              const expiryDate = dayjs(expiresAt);
              const now = dayjs();
              isExpired = expiryDate.isBefore(now);
              const isSoon = !isExpired && expiryDate.diff(now, 'day') < 7;

              if (isExpired) {
                color = 'default';
                statusLabel = t('adminUsersPage.roleExpiry.expiredAt', {
                  date: expiryDate.format('DD/MM/YYYY'),
                });
              } else if (isSoon) {
                color = 'orange';
                statusLabel = t('adminUsersPage.roleExpiry.soonExpire', {
                  date: expiryDate.format('DD/MM/YYYY'),
                });
              } else {
                color = 'green';
                statusLabel = t('adminUsersPage.roleExpiry.activeUntil', {
                  date: expiryDate.format('DD/MM/YYYY'),
                });
              }
            }

            const baseLabel = roleRef.role.title || roleRef.role.id;

            return (
              <Tooltip
                key={`${record.id}-${roleRef.role.id}`}
                title={
                  <>
                    <div>
                      {t('adminUsersPage.roleExpiry.tooltipRole')}: {baseLabel}
                    </div>
                    <div>
                      {t('adminUsersPage.roleExpiry.tooltipStatus')}:{' '}
                      {statusLabel}
                    </div>
                    <div>
                      {t('adminUsersPage.roleExpiry.tooltipExpiry')}:{' '}
                      {expiresAt
                        ? dayjs(expiresAt).format('DD/MM/YYYY HH:mm')
                        : t('adminUsersPage.roleExpiry.noExpiry')}
                    </div>
                  </>
                }
              >
                <Tag
                  color={color}
                  style={
                    isExpired ? { textDecoration: 'line-through' } : undefined
                  }
                >
                  {baseLabel}
                </Tag>
              </Tooltip>
            );
          })}
        </Space>
      ),
    },
    createDateColumn<AdminUserSummary>({
      dataIndex: 'created',
      title: t('common.table.created'),
      format: 'YYYY-MM-DD HH:mm',
      hideInSearch: true,
    }),
    {
      title: t('adminUsersPage.table.filters.role'),
      dataIndex: 'roleIds',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        mode: 'multiple',
        allowClear: true,
        showSearch: true,
        placeholder: t('adminUsersPage.table.filters.role'),
        optionFilterProp: 'label',
        options: roleOptions,
        loading: rolesLoading,
      },
    },
    createActionColumn<AdminUserSummary>({
      onView: (record) => {
        navigate(`/admin/users/${record.id}`);
      },
      onEdit: (record) => {
        if (canUpdate && !record.protected) {
          navigate(`/admin/users/${record.id}?tab=edit`);
        }
      },
      canView: () => true,
      canEdit: (record) => canUpdate && !record.protected,
      viewTooltip: t('common.actions.view'),
      editTooltip: t('common.actions.edit'),
      title: t('common.table.actions'),
      width: 80,
    }),
  ];

  return (
    <AppPage>
      <AppTable<AdminUserSummary, AdminUserTableParams>
        rowKey="id"
        columns={columns}
        actionRef={actionRef}
        search={{
          labelWidth: 'auto',
        }}
        manualRequest={false}
        request={async (params) => {
          const {
            current = 1,
            pageSize = 20,
            statuses,
            roleIds,
            search: searchParam,
          } = params;
          const take = pageSize;
          const skip = (current - 1) * pageSize;
          const normalizedRoleIds =
            roleIds?.map((id) => id.trim()).filter(Boolean) ?? [];
          const response = await adminUsersService.list({
            skip,
            take,
            statuses,
            roleIds:
              normalizedRoleIds.length > 0 ? normalizedRoleIds : undefined,
            search: searchParam?.trim() || undefined,
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
                  onClick={() => navigate('/admin/users/new')}
                >
                  {t('adminUsersPage.create.button')}
                </Button>,
              ]
            : []
        }
      />
    </AppPage>
  );
}
