import type { ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Card, Popconfirm, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { useAdminSessions } from 'src/hooks/api/useAdminSessions';
import { useAuth } from 'src/hooks/auth/useAuth';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminSessionsService } from 'src/services/api/admin-sessions.service';
import { authService } from 'src/services/api/auth.service';
import type {
  AdminSession,
  AdminSessionStatus,
} from 'src/types/admin-sessions';

type MySessionTableParams = {
  created?: [dayjs.Dayjs, dayjs.Dayjs];
};

function getStatusTag(status: AdminSessionStatus, t: any) {
  if (status === 'revoked') {
    return <Tag color="default">{t('adminSessionsPage.status.revoked')}</Tag>;
  }

  if (status === 'expired') {
    return <Tag color="default">{t('adminSessionsPage.status.expired')}</Tag>;
  }

  return <Tag color="green">{t('adminSessionsPage.status.active')}</Tag>;
}

export default function MySessionsPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission(['SESSION.VIEW', 'SESSION.VIEW_ALL'], 'any');
  const canRevoke = hasPermission(
    ['SESSION.REVOKE', 'SESSION.REVOKE_ALL'],
    'any',
  );

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const end = dayjs();
    const start = end.subtract(7, 'day');
    return [start, end];
  });
  const created0 = useMemo(() => {
    const start = dayjs(dateRange[0]);
    return start.startOf('day').toISOString();
  }, [dateRange]);
  const created1 = useMemo(() => {
    const end = dayjs(dateRange[1]);
    return end.endOf('day').toISOString();
  }, [dateRange]);

  const listParams = useMemo(
    () => ({
      take: 20,
      created0,
      created1,
      ip: undefined,
    }),
    [created0, created1],
  );

  const {
    sessions,
    statusById,
    paging,
    isLoading,
    isInitialLoading,
    reload,
    loadMore,
  } = useAdminSessions({
    initialParams: listParams,
    autoLoad: false,
  });

  useEffect(() => {
    void reload();
  }, [listParams, reload]);

  const currentSessionId = useMemo(() => {
    // Backend encodes session id inside tokens; FE does not decode,
    // so we rely on comparing createdById with current user id.
    // Current session is approximated by the latest non-revoked, non-expired session of current user.
    if (!user) return undefined;
    const currentUserSessions = sessions.filter(
      (s) => s.createdById === user.id,
    );
    const sorted = [...currentUserSessions].sort((a, b) =>
      dayjs(b.created).diff(dayjs(a.created)),
    );
    return sorted[0]?.id;
  }, [sessions, user]);

  const handleLogoutCurrent = async () => {
    await logout();
  };

  const handleLogoutAll = async () => {
    await authService.logoutAll();
    await logout();
  };

  const handleRevoke = async (session: AdminSession) => {
    await adminSessionsService.revoke([session.id]);
    await reload();

    if (session.id === currentSessionId) {
      await logout();
    }
  };

  const columns: ProColumns<AdminSession>[] = [
    {
      title: t('adminSessionsPage.table.created'),
      dataIndex: 'created',
      valueType: 'dateRange',
      sorter: (a, b) => dayjs(a.created).valueOf() - dayjs(b.created).valueOf(),
      render: (_, record) =>
        dayjs(record.created).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('adminSessionsPage.table.expired'),
      dataIndex: 'expired',
      hideInSearch: true,
      render: (_, record) =>
        dayjs(record.expired).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('adminSessionsPage.table.device'),
      dataIndex: 'device',
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => record.device,
    },
    {
      title: t('adminSessionsPage.table.ip'),
      dataIndex: 'ip',
      render: (_, record) => record.ip ?? '-',
    },
    {
      title: t('adminSessionsPage.table.status'),
      dataIndex: 'status',
      hideInSearch: true,
      render: (_, record) => {
        const status = statusById[record.id];
        return getStatusTag(status, t);
      },
    },
    {
      title: t('mySessionsPage.currentDevice'),
      dataIndex: 'current',
      hideInSearch: true,
      render: (_, record) =>
        record.id === currentSessionId ? (
          <Tag color="blue">{t('mySessionsPage.currentDevice')}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: t('adminSessionsPage.table.actions'),
      dataIndex: 'actions',
      hideInSearch: true,
      render: (_, record) => {
        const status = statusById[record.id];
        const isCurrent = record.id === currentSessionId;

        if (!canRevoke || status !== 'active') {
          return '-';
        }

        return (
          <Popconfirm
            title={t('adminSessionsPage.actions.revokeConfirmTitle')}
            description={t(
              isCurrent
                ? 'mySessionsPage.actions.revokeCurrentConfirm'
                : 'mySessionsPage.actions.revokeOtherConfirm',
            )}
            onConfirm={() => handleRevoke(record)}
          >
            <Button size="small" danger type="link">
              {t('adminSessionsPage.actions.revoke')}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  if (!canView) {
    return null;
  }

  return (
    <AppPage>
      <Card size="small">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('adminSessionsPage.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t('adminSessionsPage.subtitle')}
          </Typography.Paragraph>

          <Alert type="info" showIcon message={t('mySessionsPage.notice')} />

          <Space wrap>
            <Button onClick={handleLogoutCurrent}>
              {t('mySessionsPage.actions.logoutCurrent')}
            </Button>
            <Popconfirm
              title={t('mySessionsPage.actions.logoutAllConfirmTitle')}
              description={t('mySessionsPage.actions.logoutAllConfirm')}
              onConfirm={handleLogoutAll}
            >
              <Button danger>{t('mySessionsPage.actions.logoutAll')}</Button>
            </Popconfirm>
          </Space>
        </Space>
      </Card>

      <AppTable<AdminSession, MySessionTableParams>
        rowKey="id"
        columns={columns}
        loading={isLoading || isInitialLoading}
        dataSource={sessions}
        pagination={false}
        search={{
          labelWidth: 'auto',
        }}
        form={{
          initialValues: {
            created: dateRange,
          },
        }}
        onSubmit={(values) => {
          const range = values.created as
            | [dayjs.Dayjs, dayjs.Dayjs]
            | undefined;
          if (range && range.length === 2) {
            setDateRange([range[0]!, range[1]!]);
          }
        }}
        onReset={() => {
          const end = dayjs();
          const start = end.subtract(7, 'day');
          setDateRange([start, end]);
        }}
        toolBarRender={() => [
          paging.hasNext && (
            <Button key="load-more" onClick={loadMore}>
              {t('adminSessionsPage.actions.loadMore')}
            </Button>
          ),
        ]}
      />
    </AppPage>
  );
}
