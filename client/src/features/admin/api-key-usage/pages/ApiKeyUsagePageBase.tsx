import { Card, Space, Tabs, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AccessDeniedPage from 'src/app/pages/AccessDeniedPage';
import { AppPage } from 'src/components/common/AppPage';
import { GenericResourcePage } from 'src/components/resource/GenericResourcePage';
import { useResourcePermissions } from 'src/hooks/resource/useResourcePermissions';
import type { ApiKeyUsageStatsQueryDto } from 'src/types/api-key-usage';
import { ApiKeyUsageStats } from '../components/ApiKeyUsageStats';
import type {
  ApiKeyUsageListParamsForResource,
  ApiKeyUsageRecord,
} from '../config/api-key-usage.resource';
import { createApiKeyUsageResource } from '../config/api-key-usage.resource';

type ApiKeyUsagePageMode = 'user' | 'admin' | 'auto';

interface ApiKeyUsagePageBaseProps {
  mode?: ApiKeyUsagePageMode;
  customTitle?: string;
  customDescription?: string;
}

export function ApiKeyUsagePageBase(props: ApiKeyUsagePageBaseProps) {
  const { mode = 'auto', customTitle, customDescription } = props;
  const { t } = useTranslation();

  const resource = useMemo(() => createApiKeyUsageResource(t as any), [t]);

  const permissions = useResourcePermissions(resource);

  if (!permissions.canView) {
    return <AccessDeniedPage />;
  }

  const effectiveMode: ApiKeyUsagePageMode =
    mode === 'auto' ? (permissions.canViewAll ? 'admin' : 'user') : mode;

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const end = dayjs();
    const start = end.subtract(7, 'day');
    return [start, end];
  });

  const initialParams = useMemo<Partial<ApiKeyUsageListParamsForResource>>(
    () => ({
      take: 20,
      skip: 0,
      startDate: dateRange[0].toISOString(),
      endDate: dateRange[1].toISOString(),
    }),
    [dateRange],
  );

  const formInitialValues = useMemo(
    () =>
      ({
        timestamp: [dateRange[0], dateRange[1]],
      }) as unknown as ApiKeyUsageListParamsForResource,
    [dateRange],
  );

  const handleSubmit = (values: ApiKeyUsageListParamsForResource) => {
    const range = (values as any).timestamp as
      | [dayjs.Dayjs, dayjs.Dayjs]
      | undefined;

    if (range && range.length === 2) {
      setDateRange([range[0], range[1]]);
    }
  };

  const handleReset = () => {
    const end = dayjs();
    const start = end.subtract(7, 'day');
    setDateRange([start, end]);
  };

  const title =
    customTitle ??
    (effectiveMode === 'admin'
      ? t('apiKeyUsagePage.adminTitle')
      : t('apiKeyUsagePage.userTitle'));

  const description =
    customDescription ??
    (effectiveMode === 'admin'
      ? t('apiKeyUsagePage.adminSubtitle')
      : t('apiKeyUsagePage.userSubtitle'));

  const header = (
    <Card size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {description}
        </Typography.Paragraph>
      </Space>
    </Card>
  );

  const statsParams: ApiKeyUsageStatsQueryDto = useMemo(
    () => ({
      startDate: dateRange[0].toISOString(),
      endDate: dateRange[1].toISOString(),
    }),
    [dateRange],
  );

  return (
    <AppPage>
      <Tabs
        defaultActiveKey="history"
        items={[
          {
            key: 'history',
            label: t('apiKeyUsagePage.tabs.history'),
            children: (
              <GenericResourcePage<
                ApiKeyUsageRecord,
                ApiKeyUsageListParamsForResource
              >
                resource={resource}
                initialParams={initialParams}
                pageSize={20}
                extendBaseColumns={false}
                formInitialValues={formInitialValues}
                onSubmit={handleSubmit}
                onReset={handleReset}
                customHeader={header}
              />
            ),
          },
          {
            key: 'stats',
            label: t('apiKeyUsagePage.tabs.stats'),
            children: <ApiKeyUsageStats params={statsParams} />,
          },
        ]}
      />
    </AppPage>
  );
}
