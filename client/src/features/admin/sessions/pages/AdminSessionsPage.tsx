import type { ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Popconfirm, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { useAdminSessions } from 'src/hooks/api/useAdminSessions';
import { useAdminSettings } from 'src/hooks/api/useAdminSettings';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminSessionsService } from 'src/services/api/admin-sessions.service';
import { adminUsersService } from 'src/services/api/admin-users.service';
import type {
  AdminSession,
  AdminSessionStatus,
} from 'src/types/admin-sessions';
import type { AdminSetting } from 'src/types/admin-settings';
import { SettingDataType } from 'src/types/admin-settings';

type AdminSessionTableParams = {
  ip?: string;
  status?: 'all' | 'active' | 'revoked';
  userIds?: string[];
  created?: [dayjs.Dayjs, dayjs.Dayjs];
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
  const [ipFilter, setIpFilter] = useState<string | undefined>(undefined);
  const [userIdsFilter, setUserIdsFilter] = useState<string[] | undefined>(
    undefined,
  );
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
      ip: ipFilter,
      userIds: canViewAll ? userIdsFilter : undefined,
      revoked: statusFilter === 'revoked' ? true : undefined,
    }),
    [created0, created1, ipFilter, userIdsFilter, statusFilter, canViewAll],
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

  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<
    { label: string; value: string }[]
  >([]);

  useEffect(() => {
    if (!canViewAll) return;
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        const result = await adminUsersService.list({
          skip: 0,
          take: 20,
          search: userSearch || undefined,
        });

        setUserOptions(
          result.docs.map((user) => ({
            label: user.email,
            value: user.id,
          })),
        );
      } catch {
        // handled by global error handler in apiClient
      }
    };

    void fetchUsers();

    return () => {
      controller.abort();
    };
  }, [canViewAll, userSearch]);

  const handleRevoke = async (session: AdminSession) => {
    await adminSessionsService.revoke([session.id]);
    await reload();
  };

  const handleResetFilters = () => {
    const end = dayjs();
    const start = end.subtract(7, 'day');

    setDateRange([start, end]);
    setStatusFilter('all');
    setIpFilter(undefined);
    setUserIdsFilter(undefined);
    setUserSearch('');
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
      title: t('adminSessionsPage.table.userId'),
      dataIndex: 'createdById',
      hideInSearch: true,
      render: (_, record) => record.createdById,
    },
    ...(canViewAll
      ? [
          {
            title: t('adminSessionsPage.filters.users'),
            dataIndex: 'userIds',
            hideInTable: true,
            valueType: 'select',
            fieldProps: {
              mode: 'multiple',
              allowClear: true,
              showSearch: true,
              style: { minWidth: 240 },
              placeholder: t('adminSessionsPage.filters.users'),
              options: userOptions,
              onSearch: (value: string) => setUserSearch(value),
              filterOption: false,
            },
          } as ProColumns<AdminSession>,
        ]
      : []),
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
      {enbOnlyOneSession && (
        <Alert
          type="info"
          showIcon
          title={t('adminSessionsPage.onlyOneSessionNotice')}
          style={{ marginBottom: 16 }}
        />
      )}

      <AppTable<AdminSession, AdminSessionTableParams>
        rowKey="id"
        columns={columns}
        loading={isLoading || isInitialLoading}
        dataSource={filteredSessions}
        pagination={false}
        search={{
          labelWidth: 'auto',
        }}
        form={{
          initialValues: {
            ip: ipFilter,
            status: statusFilter,
            userIds: userIdsFilter,
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

          const ip = (values.ip as string | undefined)?.trim();
          setIpFilter(ip || undefined);

          const status =
            (values.status as 'all' | 'active' | 'revoked' | undefined) ??
            'all';
          setStatusFilter(status);

          const valuesUserIds = values.userIds as string[] | undefined;
          setUserIdsFilter(
            valuesUserIds && valuesUserIds.length ? valuesUserIds : undefined,
          );
        }}
        onReset={() => {
          handleResetFilters();
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
