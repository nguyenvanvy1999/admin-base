import type { ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Popconfirm } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import type dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { useUserSearchSelect } from 'src/features/admin/users/hooks/useUserSearchSelect';
import { createUserSelectColumn } from 'src/features/admin/users/utils/userSelectColumn';
import { useAdminSessions } from 'src/hooks/api/useAdminSessions';
import { useAdminSettings } from 'src/hooks/api/useAdminSettings';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminSessionsService } from 'src/services/api/admin-sessions.service';
import type { AdminSession } from 'src/types/admin-sessions';
import type { AdminSetting } from 'src/types/admin-settings';
import { SettingDataType } from 'src/types/admin-settings';
import { SessionsTable } from '../components/SessionsTable';
import { useSessionDateRange } from '../hooks/useSessionDateRange';
import { getSessionStatus } from '../utils/sessionStatus';

type AdminSessionTableParams = {
  ip?: string;
  status?: 'all' | 'active' | 'revoked';
  userIds?: string[];
  created?: [dayjs.Dayjs, dayjs.Dayjs];
};

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

  const { dateRange, setDateRange, created0, created1, resetDateRange } =
    useSessionDateRange(7);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'revoked'
  >('all');
  const [ipFilter, setIpFilter] = useState<string | undefined>(undefined);
  const [userIdsFilter, setUserIdsFilter] = useState<string[] | undefined>(
    undefined,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

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
    autoLoad: false,
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

  const userSearchSelect = useUserSearchSelect({
    enabled: canViewAll,
    take: 20,
  });

  const handleRevoke = async (session: AdminSession) => {
    await adminSessionsService.revoke([session.id]);
    await reload();
  };

  const handleRevokeSelected = async () => {
    if (selectedRowKeys.length === 0) return;

    await adminSessionsService.revoke(selectedRowKeys);
    setSelectedRowKeys([]);
    await reload();
  };

  const handleResetFilters = () => {
    resetDateRange();
    setStatusFilter('all');
    setIpFilter(undefined);
    setUserIdsFilter(undefined);
    userSearchSelect.setUserSearch('');
    setSelectedRowKeys([]);
  };

  const rowSelection: TableRowSelection<AdminSession> = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys.map(String));
    },
    getCheckboxProps: (record) => {
      const status = getSessionStatus(record, statusById);
      const canRevokeThis = canRevokeAll || (canRevokeSelf && !canViewAll);
      return {
        disabled: !canRevokeThis || status !== 'active',
      };
    },
  };

  const columns: ProColumns<AdminSession>[] = [
    {
      title: t('adminSessionsPage.table.userId'),
      dataIndex: 'createdById',
      hideInSearch: true,
      render: (_, record) => record.createdById,
    },
    {
      title: t('adminSessionsPage.table.status'),
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        all: { text: t('adminSessionsPage.filters.status.all') },
        active: { text: t('adminSessionsPage.filters.status.active') },
        revoked: { text: t('adminSessionsPage.filters.status.revoked') },
      },
    },
    ...(canViewAll
      ? [createUserSelectColumn<AdminSession>(userSearchSelect)]
      : []),
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

      <SessionsTable<AdminSessionTableParams>
        sessions={filteredSessions}
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
              disabled={
                selectedRowKeys.length === 0 ||
                (!canRevokeAll && !canRevokeSelf)
              }
            >
              {t('adminSessionsPage.actions.revokeSelected', {
                count: selectedRowKeys.length,
              })}
            </Button>
          </Popconfirm>,
        ]}
        formInitialValues={{
          ip: ipFilter,
          status: statusFilter,
          userIds: userIdsFilter,
          created: dateRange,
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
        onReset={handleResetFilters}
      />
    </AppPage>
  );
}
