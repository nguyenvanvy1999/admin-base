import type { ProColumns } from '@ant-design/pro-components';
import { Alert } from 'antd';
import type dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GenericResourcePage } from 'src/components/resource/GenericResourcePage';
import { createSessionResource } from 'src/features/admin/sessions/config/session.resource';
import { useSessionDateRange } from 'src/features/admin/sessions/hooks/useSessionDateRange';
import { useUserSearchSelect } from 'src/features/admin/users/hooks/useUserSearchSelect';
import { createUserSelectColumn } from 'src/features/admin/users/utils/userSelectColumn';
import { useAdminSettings } from 'src/hooks/api/useAdminSettings';
import { usePermissions } from 'src/hooks/auth/usePermissions';
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

export default function AdminSessionsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canViewAll = hasPermission('SESSION.VIEW_ALL');

  const { dateRange, setDateRange, created0, created1, resetDateRange } =
    useSessionDateRange(7);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'revoked'
  >('all');
  const [ipFilter, setIpFilter] = useState<string | undefined>(undefined);
  const [userIdsFilter, setUserIdsFilter] = useState<string[] | undefined>(
    undefined,
  );

  const sessionResource = useMemo(() => createSessionResource(t as any), [t]);

  const initialParams = useMemo<Partial<AdminSessionListParams>>(
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

  const userSearchSelect = useUserSearchSelect({
    enabled: canViewAll,
    take: 20,
  });

  const customColumns: ProColumns<AdminSession>[] = useMemo(() => {
    const columns: ProColumns<AdminSession>[] = [
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
    ];

    if (canViewAll) {
      columns.push(createUserSelectColumn<AdminSession>(userSearchSelect));
    }

    return columns;
  }, [t, canViewAll, userSearchSelect]);

  const handleResetFilters = () => {
    resetDateRange();
    setStatusFilter('all');
    setIpFilter(undefined);
    setUserIdsFilter(undefined);
    userSearchSelect.setUserSearch('');
  };

  const { data: settings = [] } = useAdminSettings();
  const enbOnlyOneSession = getSettingValue(settings, 'ENB_ONLY_ONE_SESSION');

  const customHeader = useMemo(
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

  return (
    <GenericResourcePage<AdminSession, AdminSessionListParams>
      resource={sessionResource}
      scope="admin"
      initialParams={initialParams}
      pageSize={20}
      customColumns={customColumns}
      extendBaseColumns
      formInitialValues={
        {
          ip: ipFilter,
          status: statusFilter,
          userIds: userIdsFilter,
          created: dateRange,
        } as unknown as AdminSessionListParams
      }
      onSubmit={(values) => {
        const range = (values as any).created as
          | [dayjs.Dayjs, dayjs.Dayjs]
          | undefined;
        if (range && range.length === 2) {
          setDateRange([range[0]!, range[1]!]);
        }

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
      }}
      onReset={handleResetFilters}
      customHeader={customHeader}
    />
  );
}
