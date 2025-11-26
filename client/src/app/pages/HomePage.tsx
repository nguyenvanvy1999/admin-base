import type { ProColumns } from '@ant-design/pro-components';
import { AppTable } from '@client/components/common/AppTable';
import { PageHeader } from '@client/components/common/PageHeader';
import { useNotify } from '@client/hooks/useNotify';
import { useHealthcheckQuery } from '@client/services/healthcheck';
import { Button, Card, Col, Flex, Row, Statistic, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

type PortfolioRow = {
  id: string;
  asset: string;
  allocation: number;
  performance: number;
  risk: 'Low' | 'Medium' | 'High';
};

const mockData: PortfolioRow[] = [
  { id: '1', asset: 'VN30 ETF', allocation: 40, performance: 8.2, risk: 'Low' },
  {
    id: '2',
    asset: 'US Tech Basket',
    allocation: 25,
    performance: 12.4,
    risk: 'High',
  },
  {
    id: '3',
    asset: 'Gold Futures',
    allocation: 15,
    performance: 4.1,
    risk: 'Medium',
  },
  {
    id: '4',
    asset: 'Corporate Bonds',
    allocation: 20,
    performance: 6.3,
    risk: 'Low',
  },
];

const columns: ProColumns<PortfolioRow>[] = [
  {
    title: 'dashboard.columns.asset',
    dataIndex: 'asset',
  },
  {
    title: 'dashboard.columns.allocation',
    dataIndex: 'allocation',
    valueType: 'percent',
  },
  {
    title: 'dashboard.columns.performance',
    dataIndex: 'performance',
    valueType: 'percent',
  },
  {
    title: 'dashboard.columns.risk',
    dataIndex: 'risk',
    valueEnum: {
      Low: { text: 'dashboard.columns.riskLow', status: 'Success' },
      Medium: { text: 'dashboard.columns.riskMedium', status: 'Processing' },
      High: { text: 'dashboard.columns.riskHigh', status: 'Error' },
    },
    render: (_, record) => (
      <Tag
        color={
          record.risk === 'High'
            ? 'red'
            : record.risk === 'Medium'
              ? 'gold'
              : 'green'
        }
      >
        {record.risk}
      </Tag>
    ),
  },
];

export default function HomePage() {
  const { data, isLoading } = useHealthcheckQuery();
  const notify = useNotify();
  const { t } = useTranslation();

  return (
    <Flex vertical gap={24}>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        extra={
          <Button
            type="primary"
            onClick={() => notify.success(t('dashboard.notificationMessage'))}
          >
            {t('dashboard.sendSampleNotification')}
          </Button>
        }
      />

      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('dashboard.aumTitle')}
              prefix="$"
              precision={2}
              value={128.6}
              suffix="M"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('dashboard.ytdReturnTitle')}
              value={9.42}
              precision={2}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title={t('dashboard.portfolioCountTitle')} value={24} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Typography.Title level={4}>
          {t('dashboard.systemStatusTitle')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {t('dashboard.apiHealthcheckLabel')}{' '}
          {isLoading
            ? t('dashboard.checking')
            : (data?.status ?? t('dashboard.unknown'))}
        </Typography.Paragraph>
      </Card>

      <Card>
        <AppTable<PortfolioRow>
          dataSource={mockData}
          columns={columns}
          headerTitle={t('dashboard.tableTitle')}
          pagination={false}
          search={false}
        />
      </Card>
    </Flex>
  );
}
