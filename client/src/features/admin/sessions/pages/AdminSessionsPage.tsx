import type { ProColumns } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { useAdminSessions } from 'src/hooks/api/useAdminSessions';
import { useAdminSettings } from 'src/hooks/api/useAdminSettings';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminSessionsService } from 'src/services/api/admin-sessions.service';
import type {
  AdminSession,
  AdminSessionStatus,
} from 'src/types/admin-sessions';
import type { AdminSetting } from 'src/types/admin-settings';
import { SettingDataType } from 'src/types/admin-settings';

const { RangePicker } = DatePicker;

type AdminSessionTableParams = {
  ip?: string;
  status?: 'all' | 'active' | 'revoked';
};

function getSessionStatus(
  record: AdminSession,
  statusById: Record<string, AdminSessionStatus>,
): AdminSessionStatus {
  return statusById[record.id] ?? 'expired';
}

function getStatusTag(status: AdminSessionStatus, t: any) {
  if (status === 'revoked') {
    return <Tag color="default">{t('adminSessionsPage.status.revoked')}</Tag>;
  }

  if (status === 'expired') {
    return <Tag color="default">{t('adminSessionsPage.status.expired')}</Tag>;
  }

  return <Tag color="green">{t('adminSessionsPage.status.active')}</Tag>;
}

function getSettingValue(
  settings: AdminSetting[],
  key: string,
): boolean | undefined {
  const setting = settings.find((s) => s.key === key);
  if (!setting) return undefined;
  if (setting.type !== SettingDataType.BOOLEAN) return undefined;
  return setting.value === 'true' || setting.value === '1';
}

export default function AdminSessionsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canViewAll = hasPermission('SESSION.VIEW_ALL');
  const canView = hasPermission(['SESSION.VIEW_ALL', 'SESSION.VIEW'], 'any');
  const canRevokeAll = hasPermission('SESSION.REVOKE_ALL');
  const canRevokeSelf = hasPermission('SESSION.REVOKE');

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const end = dayjs();
    const start = end.subtract(7, 'day');
    return [start, end];
  });
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'revoked'
  >('all');
  const created0 = useMemo(
    () => dateRange[0].startOf('day').toISOString(),
    [dateRange],
  );
  const created1 = useMemo(
    () => dateRange[1].endOf('day').toISOString(),
    [dateRange],
  );

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
  });

  useEffect(() => {
    void reload();
  }, [listParams, reload]);

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'all') return sessions;
    return sessions.filter((session) => {
      const status = getSessionStatus(session, statusById);
      if (statusFilter === 'active') {
        return status === 'active';
      }
      return status === 'revoked';
    });
  }, [sessions, statusById, statusFilter]);

  const { data: settings = [] } = useAdminSettings();
  const enbOnlyOneSession = getSettingValue(settings, 'ENB_ONLY_ONE_SESSION');

  const handleRevoke = async (session: AdminSession) => {
    await adminSessionsService.revoke([session.id]);
    await reload();
  };

  const columns: ProColumns<AdminSession>[] = [
    {
      title: t('adminSessionsPage.table.created'),
      dataIndex: 'created',
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
      title: t('adminSessionsPage.table.userId'),
      dataIndex: 'createdById',
      hideInSearch: true,
      render: (_, record) => record.createdById,
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
        const status = getSessionStatus(record, statusById);
        return getStatusTag(status, t);
      },
    },
    {
      title: t('adminSessionsPage.table.actions'),
      dataIndex: 'actions',
      hideInSearch: true,
      render: (_, record) => {
        const status = getSessionStatus(record, statusById);
        if (status !== 'active') {
          return '-';
        }

        const canRevokeThis = canRevokeAll || (canRevokeSelf && !canViewAll);

        if (!canRevokeThis) {
          return '-';
        }

        return (
          <Popconfirm
            title={t('adminSessionsPage.actions.revokeConfirmTitle')}
            description={t('adminSessionsPage.actions.revokeConfirm')}
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
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('adminSessionsPage.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t('adminSessionsPage.subtitle')}
          </Typography.Paragraph>

          {enbOnlyOneSession && (
            <Alert
              type="info"
              showIcon
              message={t('adminSessionsPage.onlyOneSessionNotice')}
            />
          )}

          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={(range) => {
                if (!range || range.length !== 2) return;
                setDateRange([range[0]!, range[1]!]);
              }}
              allowClear={false}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: 200 }}
              options={[
                {
                  label: t('adminSessionsPage.filters.status.all'),
                  value: 'all',
                },
                {
                  label: t('adminSessionsPage.filters.status.active'),
                  value: 'active',
                },
                {
                  label: t('adminSessionsPage.filters.status.revoked'),
                  value: 'revoked',
                },
              ]}
            />
          </Space>
        </Space>
      </Card>

      <AppTable<AdminSession, AdminSessionTableParams>
        rowKey="id"
        columns={columns}
        loading={isLoading || isInitialLoading}
        search={false}
        dataSource={filteredSessions}
        pagination={false}
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
