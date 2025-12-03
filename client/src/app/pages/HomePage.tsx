import { ReloadOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { useHealthcheck } from 'src/hooks/api/useHealthcheck';
import type {
  HealthcheckComponentStatus,
  HealthcheckState,
} from 'src/services/api/healthcheck.service';

const { Title, Paragraph, Text } = Typography;
const COMPONENT_KEYS = ['memory', 'redis', 'db', 'disk'] as const;
type HealthComponentKey = (typeof COMPONENT_KEYS)[number];

function getTagColor(status?: HealthcheckState) {
  if (status === 'ok') return 'success';
  if (status === 'error') return 'error';
  return 'default';
}

function formatMetricLabel(label: string) {
  return label
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function formatComponentError(error: unknown) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, isError, refetch } = useHealthcheck();

  const componentConfigs = useMemo(
    () =>
      COMPONENT_KEYS.map((key) => ({
        key,
        label: t(`dashboard.health.components.${key}`),
        description: t(`dashboard.health.componentDescriptions.${key}`),
      })),
    [t],
  );

  const renderComponentMetrics = (component?: HealthcheckComponentStatus) => {
    if (!component) {
      return (
        <Text type="secondary">{t('dashboard.health.componentNoData')}</Text>
      );
    }

    const entries = Object.entries(component).filter(([key, value]) => {
      if (key === 'status' || key === 'error') return false;
      return (
        value !== null &&
        value !== undefined &&
        (typeof value === 'string' || typeof value === 'number')
      );
    });

    if (!entries.length) {
      return (
        <Text type="secondary">{t('dashboard.health.componentNoData')}</Text>
      );
    }

    return (
      <Space orientation="vertical" size={4} style={{ width: '100%' }}>
        {entries.slice(0, 3).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <Text type="secondary">{formatMetricLabel(key)}</Text>
            <Text strong>{String(value)}</Text>
          </div>
        ))}
      </Space>
    );
  };

  const renderComponentGrid = () => {
    if (!data?.details) {
      return <Text type="secondary">{t('dashboard.health.noDetails')}</Text>;
    }

    return (
      <Row gutter={[16, 16]}>
        {componentConfigs.map((config) => {
          const component = data.details?.[config.key as HealthComponentKey];
          const tagColor = getTagColor(component?.status);

          return (
            <Col xs={24} md={12} xl={6} key={config.key}>
              <Card size="small" style={{ height: '100%' }}>
                <Space
                  orientation="vertical"
                  size={12}
                  style={{ width: '100%' }}
                >
                  <Space align="center">
                    <Text strong>{config.label}</Text>
                    {component ? (
                      <Tag color={tagColor}>
                        {component.status === 'ok'
                          ? t('dashboard.health.componentOk')
                          : t('dashboard.health.componentErrorTitle')}
                      </Tag>
                    ) : (
                      <Tag>{t('dashboard.health.componentNoData')}</Tag>
                    )}
                  </Space>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {config.description}
                  </Paragraph>
                  {component?.error ? (
                    <Alert
                      type="error"
                      showIcon
                      title={t('dashboard.health.componentErrorTitle')}
                      description={formatComponentError(component.error)}
                    />
                  ) : (
                    renderComponentMetrics(component)
                  )}
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  const overallStatus = data?.status;
  const statusCopy =
    overallStatus === 'ok'
      ? t('dashboard.health.statusOk')
      : overallStatus === 'error'
        ? t('dashboard.health.statusError')
        : isError
          ? t('dashboard.health.error')
          : t('dashboard.health.loading');

  return (
    <AppPage>
      <Space orientation="vertical" size={24} style={{ width: '100%' }}>
        <Card
          title={t('dashboard.health.overviewTitle')}
          extra={
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              {t('dashboard.health.refresh')}
            </Button>
          }
        >
          <Paragraph type="secondary">
            {t('dashboard.health.overviewDescription')}
          </Paragraph>

          {isLoading ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <Space
                orientation="vertical"
                align="center"
                size={12}
                style={{ width: '100%' }}
              >
                <Spin />
                <Text type="secondary">{t('dashboard.health.loading')}</Text>
              </Space>
            </div>
          ) : isError && !data ? (
            <Alert
              type="error"
              showIcon
              title={t('dashboard.health.error')}
              action={
                <Button size="small" onClick={() => refetch()}>
                  {t('dashboard.health.refresh')}
                </Button>
              }
            />
          ) : (
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Space align="center">
                <Text strong>{t('dashboard.health.statusLabel')}</Text>
                <Tag color={getTagColor(overallStatus)}>{statusCopy}</Tag>
              </Space>
              <Divider style={{ margin: '12px 0' }} />
              <Title level={5} style={{ marginBottom: 0 }}>
                {t('dashboard.health.componentsTitle')}
              </Title>
              {renderComponentGrid()}
            </Space>
          )}
        </Card>
      </Space>
    </AppPage>
  );
}
