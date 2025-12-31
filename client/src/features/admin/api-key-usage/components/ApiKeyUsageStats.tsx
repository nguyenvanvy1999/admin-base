import { Card, Col, Empty, Row, Skeleton, Statistic, Table, Tag } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiKeyUsageStats } from 'src/hooks/api/useApiKeyUsageStats';
import type { ApiKeyUsageStatsQueryDto } from 'src/types/api-key-usage';

interface ApiKeyUsageStatsProps {
  params: ApiKeyUsageStatsQueryDto;
}

export function ApiKeyUsageStats({ params }: ApiKeyUsageStatsProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useApiKeyUsageStats(
    params,
    true,
  );

  const totalErrors = useMemo(() => {
    if (!data) return 0;
    return Object.entries(data.requestsByStatusCode).reduce(
      (acc, [code, count]) => {
        const status = Number(code);
        if (status >= 400) return acc + count;
        return acc;
      },
      0,
    );
  }, [data]);

  if (isLoading) {
    return (
      <Row gutter={16}>
        <Col span={24}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Col>
      </Row>
    );
  }

  if (isError) {
    return (
      <Card>
        <Empty
          description={t('apiKeyUsagePage.stats.error')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <a onClick={() => refetch()}>{t('apiKeyUsagePage.stats.retry')}</a>
        </Empty>
      </Card>
    );
  }

  if (!data || data.totalRequests === 0) {
    return (
      <Card>
        <Empty
          description={t('apiKeyUsagePage.stats.empty')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const errorRate =
    data.totalRequests > 0
      ? Number(((totalErrors / data.totalRequests) * 100).toFixed(2))
      : 0;

  const methodRows = Object.entries(data.requestsByMethod).map(
    ([method, count]) => ({
      key: method,
      method,
      count,
    }),
  );

  const endpointRows = Object.entries(data.requestsByEndpoint).map(
    ([endpoint, count]) => ({
      key: endpoint,
      endpoint,
      count,
    }),
  );

  const statusRows = Object.entries(data.requestsByStatusCode).map(
    ([code, count]) => ({
      key: code,
      statusCode: Number(code),
      count,
    }),
  );

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card>
          <Statistic
            title={t('apiKeyUsagePage.stats.totalRequests')}
            value={data.totalRequests}
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Statistic
            title={t('apiKeyUsagePage.stats.totalErrors')}
            value={totalErrors}
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Statistic
            title={t('apiKeyUsagePage.stats.errorRate')}
            value={errorRate}
            suffix="%"
          />
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card
          title={t('apiKeyUsagePage.stats.byMethod')}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            size="small"
            pagination={false}
            dataSource={methodRows}
            columns={[
              {
                title: t('apiKeyUsagePage.fields.method'),
                dataIndex: 'method',
                key: 'method',
                render: (value: string) => <Tag>{value}</Tag>,
              },
              {
                title: t('common.fields.count'),
                dataIndex: 'count',
                key: 'count',
              },
            ]}
          />
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card
          title={t('apiKeyUsagePage.stats.byStatus')}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            size="small"
            pagination={false}
            dataSource={statusRows}
            columns={[
              {
                title: t('apiKeyUsagePage.fields.statusCode'),
                dataIndex: 'statusCode',
                key: 'statusCode',
              },
              {
                title: t('common.fields.count'),
                dataIndex: 'count',
                key: 'count',
              },
            ]}
          />
        </Card>
      </Col>

      <Col span={24}>
        <Card
          title={t('apiKeyUsagePage.stats.topEndpoints')}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            size="small"
            pagination={false}
            dataSource={endpointRows}
            columns={[
              {
                title: t('apiKeyUsagePage.fields.endpoint'),
                dataIndex: 'endpoint',
                key: 'endpoint',
                ellipsis: true,
              },
              {
                title: t('common.fields.count'),
                dataIndex: 'count',
                key: 'count',
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
