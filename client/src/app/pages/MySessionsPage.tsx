import type { ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Card, Popconfirm, Space, Tag, Typography } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { SessionsTable } from 'src/features/admin/sessions/components/SessionsTable';
import { useSessionDateRange } from 'src/features/admin/sessions/hooks/useSessionDateRange';
import { getSessionStatus } from 'src/features/admin/sessions/utils/sessionStatus';
import { useAdminSessions } from 'src/hooks/api/useAdminSessions';
import { useAuth } from 'src/hooks/auth/useAuth';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminSessionsService } from 'src/services/api/admin-sessions.service';
import { authService } from 'src/services/api/auth.service';
import type { AdminSession } from 'src/types/admin-sessions';

type MySessionTableParams = {
  created?: [dayjs.Dayjs, dayjs.Dayjs];
};

export default function MySessionsPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const canView = hasPermission(['SESSION.VIEW', 'SESSION.VIEW_ALL'], 'any');
  const canRevoke = hasPermission(
    ['SESSION.REVOKE', 'SESSION.REVOKE_ALL'],
    'any',
  );

  const { dateRange, setDateRange, created0, created1, resetDateRange } =
    useSessionDateRange(7);

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

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

  const handleRevokeSelected = async () => {
    if (selectedRowKeys.length === 0) return;

    await adminSessionsService.revoke(selectedRowKeys);
    setSelectedRowKeys([]);
    await reload();

    if (currentSessionId && selectedRowKeys.includes(currentSessionId)) {
      await logout();
    }
  };

  const rowSelection: TableRowSelection<AdminSession> = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys.map(String));
    },
    getCheckboxProps: (record) => {
      const status = getSessionStatus(record, statusById);
      return {
        disabled: !canRevoke || status !== 'active',
      };
    },
  };

  const columns: ProColumns<AdminSession>[] = [
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
        const status = getSessionStatus(record, statusById);
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
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('adminSessionsPage.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t('adminSessionsPage.subtitle')}
          </Typography.Paragraph>

          <Alert type="info" showIcon title={t('mySessionsPage.notice')} />

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

      <SessionsTable<MySessionTableParams>
        sessions={sessions}
        statusById={statusById}
        loading={isLoading || isInitialLoading}
        paging={paging}
        onLoadMore={loadMore}
        columns={columns}
        extendBaseColumns
        rowSelection={rowSelection}
        extraToolbarActions={[
          <Popconfirm
            key="revoke-selected"
            title={t('adminSessionsPage.actions.revokeSelectedConfirmTitle')}
            description={t('adminSessionsPage.actions.revokeSelectedConfirm', {
              count: selectedRowKeys.length,
            })}
            onConfirm={handleRevokeSelected}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || !canRevoke}
            >
              {t('adminSessionsPage.actions.revokeSelected', {
                count: selectedRowKeys.length,
              })}
            </Button>
          </Popconfirm>,
        ]}
        formInitialValues={{
          created: dateRange,
        }}
        onSubmit={(values) => {
          const range = values.created as
            | [dayjs.Dayjs, dayjs.Dayjs]
            | undefined;
          if (range && range.length === 2) {
            setDateRange([range[0]!, range[1]!]);
          }
        }}
        onReset={resetDateRange}
      />
    </AppPage>
  );
}
