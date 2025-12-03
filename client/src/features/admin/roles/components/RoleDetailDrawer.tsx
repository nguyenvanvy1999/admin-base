import type { ProColumns } from '@ant-design/pro-components';
import { ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Alert, Skeleton, Space, Tabs, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppDrawer } from 'src/components/common/AppDrawer';
import { useAdminPermissions } from 'src/hooks/api/useAdminPermissions';
import { useAdminRoleDetail } from 'src/hooks/api/useAdminRoles';
import type { RolePlayerDetail } from 'src/types/admin-roles';

interface RoleDetailDrawerProps {
  roleId?: string | null;
  open: boolean;
  onClose: () => void;
  onActionCompleted?: () => void;
  initialTab?: 'general' | 'permissions' | 'players';
}

function getRoleExpiryMeta(expiresAt: string | null) {
  if (!expiresAt) {
    return {
      status: 'no-expiry' as const,
      color: 'default' as const,
      isExpired: false,
      isSoon: false,
      date: null as dayjs.Dayjs | null,
    };
  }
  const expiryDate = dayjs(expiresAt);
  const now = dayjs();
  const isExpired = expiryDate.isBefore(now);
  const isSoon = !isExpired && expiryDate.diff(now, 'day') < 7;

  if (isExpired) {
    return {
      status: 'expired' as const,
      color: 'default' as const,
      isExpired: true,
      isSoon: false,
      date: expiryDate,
    };
  }

  if (isSoon) {
    return {
      status: 'soon' as const,
      color: 'orange' as const,
      isExpired: false,
      isSoon: true,
      date: expiryDate,
    };
  }

  return {
    status: 'active' as const,
    color: 'green' as const,
    isExpired: false,
    isSoon: false,
    date: expiryDate,
  };
}

export function RoleDetailDrawer({
  roleId,
  open,
  onClose,
  onActionCompleted,
  initialTab = 'general',
}: RoleDetailDrawerProps) {
  const [tabKey, setTabKey] = useState<'general' | 'permissions' | 'players'>(
    initialTab,
  );
  const { t } = useTranslation();

  const { data, isLoading } = useAdminRoleDetail(roleId ?? undefined);
  const { data: allPermissions = [], isLoading: permissionsLoading } =
    useAdminPermissions();

  const permissionMap = useMemo(() => {
    const map = new Map<
      string,
      { title: string; description?: string | null }
    >();
    allPermissions.forEach((perm) => {
      map.set(perm.id, perm);
    });
    return map;
  }, [allPermissions]);

  const playerStats = useMemo(() => {
    if (!data) {
      return { total: 0, active: 0, expired: 0 };
    }
    const now = dayjs();
    let active = 0;
    let expired = 0;

    data.players.forEach((player) => {
      if (!player.expiresAt) {
        active += 1;
      } else {
        const expiryDate = dayjs(player.expiresAt);
        if (expiryDate.isBefore(now)) {
          expired += 1;
        } else {
          active += 1;
        }
      }
    });

    return {
      total: data.players.length,
      active,
      expired,
    };
  }, [data]);

  useEffect(() => {
    if (open) {
      setTabKey(initialTab);
    }
  }, [initialTab, open]);

  const playerColumns: ProColumns<RolePlayerDetail>[] = [
    {
      title: t('adminRolesPage.players.table.email'),
      dataIndex: 'email',
      copyable: true,
      ellipsis: true,
    },
    {
      title: t('adminRolesPage.players.table.expiresAt'),
      dataIndex: 'expiresAt',
      render: (_, record) => {
        const meta = getRoleExpiryMeta(record.expiresAt);
        if (!record.expiresAt) {
          return (
            <Tag color="default">{t('adminUsersPage.roleExpiry.noExpiry')}</Tag>
          );
        }

        let statusLabel = t('adminUsersPage.roleExpiry.noExpiry');
        if (meta.status === 'active' && meta.date) {
          statusLabel = t('adminUsersPage.roleExpiry.activeUntil', {
            date: meta.date.format('DD/MM/YYYY'),
          });
        } else if (meta.status === 'soon' && meta.date) {
          statusLabel = t('adminUsersPage.roleExpiry.soonExpire', {
            date: meta.date.format('DD/MM/YYYY'),
          });
        } else if (meta.status === 'expired' && meta.date) {
          statusLabel = t('adminUsersPage.roleExpiry.expiredAt', {
            date: meta.date.format('DD/MM/YYYY'),
          });
        }

        return (
          <Tooltip
            title={
              <>
                <div>
                  {t('adminUsersPage.roleExpiry.tooltipStatus')}: {statusLabel}
                </div>
                <div>
                  {t('adminUsersPage.roleExpiry.tooltipExpiry')}:{' '}
                  {meta.date?.format('DD/MM/YYYY HH:mm') ?? '-'}
                </div>
              </>
            }
          >
            <Tag
              color={meta.color}
              style={
                meta.status === 'expired'
                  ? { textDecoration: 'line-through' }
                  : undefined
              }
            >
              {meta.date?.format('DD/MM/YYYY HH:mm') ?? '-'}
            </Tag>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={t('adminRolesPage.detail.title')}
      size={800}
    >
      {isLoading && <Skeleton active paragraph={{ rows: 6 }} />}
      {!isLoading && !data && (
        <Alert type="warning" title={t('errors.itemNotFound')} showIcon />
      )}
      {!isLoading && data && (
        <Tabs
          activeKey={tabKey}
          onChange={(key) => setTabKey(key as typeof tabKey)}
          items={[
            {
              key: 'general',
              label: t('adminRolesPage.detail.tabGeneral'),
              children: (
                <ProDescriptions column={1} bordered>
                  <ProDescriptions.Item label={t('adminRolesPage.table.title')}>
                    {data.title}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item
                    label={t('adminRolesPage.table.description')}
                  >
                    {data.description ?? '-'}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item
                    label={t('adminRolesPage.table.enabled')}
                  >
                    <Tag color={data.enabled ? 'green' : 'red'}>
                      {data.enabled
                        ? t('common.enabled')
                        : t('common.disabled')}
                    </Tag>
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('adminRolesPage.table.users')}>
                    <Tooltip
                      title={t('adminRolesPage.users.tooltip', {
                        total: playerStats.total,
                        active: playerStats.active,
                        expired: playerStats.expired,
                      })}
                    >
                      <Space>
                        <Tag color="blue">
                          {t('adminRolesPage.users.total')}: {playerStats.total}
                        </Tag>
                        <Tag color="green">
                          {t('adminRolesPage.users.active')}:{' '}
                          {playerStats.active}
                        </Tag>
                        <Tag color="default">
                          {t('adminRolesPage.users.expired')}:{' '}
                          {playerStats.expired}
                        </Tag>
                      </Space>
                    </Tooltip>
                  </ProDescriptions.Item>
                </ProDescriptions>
              ),
            },
            {
              key: 'permissions',
              label: t('adminRolesPage.detail.tabPermissions'),
              children: (
                <ProTable
                  rowKey="id"
                  search={false}
                  pagination={false}
                  loading={permissionsLoading}
                  dataSource={data.permissionIds
                    .map((id) => {
                      const perm = permissionMap.get(id);
                      if (!perm) return null;
                      return {
                        id,
                        title: perm.title,
                        description: perm.description ?? null,
                      };
                    })
                    .filter(
                      (
                        item,
                      ): item is {
                        id: string;
                        title: string;
                        description: string | null;
                      } => item !== null,
                    )}
                  columns={[
                    {
                      title: t('adminPermissionsPage.table.title'),
                      dataIndex: 'title',
                      copyable: true,
                    },
                    {
                      title: t('adminPermissionsPage.table.description'),
                      dataIndex: 'description',
                      render: (_, record) => record.description ?? '-',
                    },
                  ]}
                />
              ),
            },
            {
              key: 'players',
              label: t('adminRolesPage.detail.tabPlayers'),
              children: (
                <ProTable
                  rowKey="id"
                  search={false}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                  }}
                  dataSource={data.players}
                  columns={playerColumns}
                />
              ),
            },
          ]}
        />
      )}
    </AppDrawer>
  );
}
