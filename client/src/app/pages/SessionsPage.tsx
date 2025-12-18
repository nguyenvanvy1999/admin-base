import type { ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Card, Popconfirm, Space, Tag, Typography } from 'antd';
import type dayjs from 'dayjs';
import dayjsLib from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GenericResourcePage } from 'src/components/resource/GenericResourcePage';
import { createSessionResource } from 'src/features/admin/sessions/config/session.resource';
import { useSessionDateRange } from 'src/features/admin/sessions/hooks/useSessionDateRange';
import { useUserSearchSelect } from 'src/features/admin/users/hooks/useUserSearchSelect';
import { createUserSelectColumn } from 'src/features/admin/users/utils/userSelectColumn';
import { useAdminSettings } from 'src/hooks/api/useAdminSettings';
import { useAuth } from 'src/hooks/auth/useAuth';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { useResourcePermissions } from 'src/hooks/resource/useResourcePermissions';
import type { AdminSetting } from 'src/types/admin';
import { SettingDataType } from 'src/types/admin';
import type {
  AdminSession,
  AdminSessionListParams,
} from 'src/types/admin-sessions';

function getSettingValue(
  settings: AdminSetting[],
  key: string,
): boolean | undefined {
  const setting = settings.find((s) => s.key === key);
  if (!setting) return undefined;
  if (setting.type !== SettingDataType.BOOLEAN) return undefined;
  return setting.value === 'true' || setting.value === '1';
}

export default function SessionsPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();

  const baseResource = useMemo(() => createSessionResource(t as any), [t]);
  const permissions = useResourcePermissions(baseResource);
  const canViewAll =
    permissions.canViewAll && hasPermission('SESSION.VIEW_ALL');

  const { dateRange, setDateRange, created0, created1, resetDateRange } =
    useSessionDateRange(7);

  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'revoked'
  >('all');
  const [ipFilter, setIpFilter] = useState<string | undefined>(undefined);
  const [userIdsFilter, setUserIdsFilter] = useState<string[] | undefined>(
    undefined,
  );

  const sessionResource = baseResource;

  const initialParams = useMemo<Partial<AdminSessionListParams>>(
    () => ({
      take: 20,
      created0,
      created1,
      ip: canViewAll ? ipFilter : undefined,
      userIds: canViewAll ? userIdsFilter : undefined,
      revoked: statusFilter === 'revoked' ? true : undefined,
    }),
    [canViewAll, created0, created1, ipFilter, userIdsFilter, statusFilter],
  );

  const userSearchSelect = useUserSearchSelect({
    enabled: canViewAll,
    take: 20,
  });

  const customColumns: ProColumns<AdminSession>[] = useMemo(() => {
    const columns: ProColumns<AdminSession>[] = [];

    if (canViewAll) {
      columns.push(
        {
          title: t('common.fields.userId'),
          dataIndex: 'createdById',
          hideInSearch: true,
          render: (_: unknown, record: AdminSession) => record.createdById,
        },
        {
          title: t('common.fields.status'),
          dataIndex: 'status',
          hideInTable: true,
          valueType: 'select',
          valueEnum: {
            all: { text: t('common.filters.statusOptions.all') },
            active: { text: t('common.filters.statusOptions.active') },
            revoked: { text: t('common.filters.statusOptions.revoked') },
          },
        },
      );

      columns.push(
        createUserSelectColumn<AdminSession>(userSearchSelect, t as any),
      );
    } else {
      columns.push({
        title: t('mySessionsPage.currentDevice'),
        dataIndex: 'current',
        hideInSearch: true,
        render: (_: unknown, record: AdminSession) => {
          if (!user) return '-';
          const isCurrent =
            record.createdById === user.id &&
            !record.revoked &&
            dayjsLib(record.expired).isAfter(dayjsLib());
          return isCurrent ? (
            <Tag color="blue">{t('mySessionsPage.currentDevice')}</Tag>
          ) : (
            '-'
          );
        },
      });
    }

    return columns;
  }, [t, canViewAll, userSearchSelect, user]);

  const handleResetFilters = () => {
    resetDateRange();
    setStatusFilter('all');
    setIpFilter(undefined);
    setUserIdsFilter(undefined);
    if (canViewAll) {
      userSearchSelect.setUserSearch('');
    }
  };

  const { data: settings = [] } = useAdminSettings();
  const enbOnlyOneSession = getSettingValue(settings, 'ENB_ONLY_ONE_SESSION');

  const headerForUser = useMemo(
    () => (
      <Card size="small">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('adminSessionsPage.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t('adminSessionsPage.subtitle')}
          </Typography.Paragraph>

          <Alert type="info" showIcon title={t('mySessionsPage.notice')} />

          <Space wrap>
            <Button onClick={() => logout()}>
              {t('common.actions.logoutCurrent')}
            </Button>
            <Popconfirm
              title={t('mySessionsPage.dialogs.logoutAllConfirmTitle')}
              description={t('mySessionsPage.dialogs.logoutAllConfirm')}
              onConfirm={async () => {
                const { authService } = await import(
                  'src/services/api/auth.service'
                );
                await authService.logoutAll();
                await logout();
              }}
            >
              <Button danger>{t('common.actions.logoutAll')}</Button>
            </Popconfirm>
          </Space>
        </Space>
      </Card>
    ),
    [t, logout],
  );

  const headerForAdmin = useMemo(
    () =>
      enbOnlyOneSession ? (
        <Alert
          type="info"
          showIcon
          title={t('adminSessionsPage.onlyOneSessionNotice')}
          style={{ marginBottom: 16 }}
        />
      ) : undefined,
    [enbOnlyOneSession, t],
  );

  const formInitialValues = useMemo(
    () =>
      ({
        ip: canViewAll ? ipFilter : undefined,
        status: canViewAll ? statusFilter : undefined,
        userIds: canViewAll ? userIdsFilter : undefined,
        created: dateRange,
      }) as unknown as AdminSessionListParams,
    [canViewAll, ipFilter, statusFilter, userIdsFilter, dateRange],
  );

  return (
    <GenericResourcePage<AdminSession, AdminSessionListParams>
      resource={sessionResource}
      initialParams={initialParams}
      pageSize={20}
      customColumns={customColumns}
      extendBaseColumns
      formInitialValues={formInitialValues}
      onSubmit={(values) => {
        const range = (values as any).created as
          | [dayjs.Dayjs, dayjs.Dayjs]
          | undefined;
        if (range && range.length === 2) {
          setDateRange([range[0]!, range[1]!]);
        }

        if (canViewAll) {
          const ip = (values.ip as string | undefined)?.trim();
          setIpFilter(ip || undefined);

          const status =
            ((values as any).status as
              | 'all'
              | 'active'
              | 'revoked'
              | undefined) ?? 'all';
          setStatusFilter(status);

          const valuesUserIds = (values as any).userIds as string[] | undefined;
          setUserIdsFilter(
            valuesUserIds && valuesUserIds.length ? valuesUserIds : undefined,
          );
        }
      }}
      onReset={handleResetFilters}
      customHeader={canViewAll ? headerForAdmin : headerForUser}
    />
  );
}
