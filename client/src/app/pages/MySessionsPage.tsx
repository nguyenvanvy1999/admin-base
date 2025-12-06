import type { ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Card, Popconfirm, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GenericResourcePage } from 'src/components/resource/GenericResourcePage';
import { createSessionResource } from 'src/features/admin/sessions/config/session.resource';
import { useSessionDateRange } from 'src/features/admin/sessions/hooks/useSessionDateRange';
import { useAuth } from 'src/hooks/auth/useAuth';
import type {
  AdminSession,
  AdminSessionListParams,
} from 'src/types/admin-sessions';

export default function MySessionsPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { dateRange, setDateRange, created0, created1, resetDateRange } =
    useSessionDateRange(7);

  const sessionResource = useMemo(() => createSessionResource(t as any), [t]);

  const initialParams = useMemo<Partial<AdminSessionListParams>>(
    () => ({
      take: 20,
      created0,
      created1,
      ip: undefined,
    }),
    [created0, created1],
  );

  const customColumns: ProColumns<AdminSession>[] = useMemo(() => {
    return [
      {
        title: t('mySessionsPage.currentDevice'),
        dataIndex: 'current',
        hideInSearch: true,
        render: (_: unknown, record: AdminSession) => {
          if (!user) return '-';
          const isCurrent =
            record.createdById === user.id &&
            !record.revoked &&
            dayjs(record.expired).isAfter(dayjs());
          return isCurrent ? (
            <Tag color="blue">{t('mySessionsPage.currentDevice')}</Tag>
          ) : (
            '-'
          );
        },
      },
    ];
  }, [t, user]);

  const customHeader = useMemo(
    () => (
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

  return (
    <GenericResourcePage<AdminSession, AdminSessionListParams>
      resource={sessionResource}
      scope="user"
      initialParams={initialParams}
      pageSize={20}
      customColumns={customColumns}
      extendBaseColumns
      formInitialValues={
        {
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
      }}
      onReset={resetDateRange}
      customHeader={customHeader}
    />
  );
}
