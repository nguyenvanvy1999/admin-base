import type { ProColumns } from '@ant-design/pro-components';
import { ProCard, StatisticCard } from '@ant-design/pro-components';
import { Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { useHealthcheck } from 'src/hooks/api/useHealthcheck';
import { useNotify } from 'src/hooks/useNotify';

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
  const { data, isLoading } = useHealthcheck();
  const notify = useNotify();
  const { t } = useTranslation();

  return (
    <AppPage
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
    >
      <ProCard ghost gutter={16} wrap>
        <StatisticCard
          colSpan={{ xs: 24, sm: 12, lg: 8 }}
          statistic={{
            title: t('dashboard.aumTitle'),
            prefix: '$',
            precision: 2,
            value: 128.6,
            suffix: 'M',
          }}
        />
        <StatisticCard
          colSpan={{ xs: 24, sm: 12, lg: 8 }}
          statistic={{
            title: t('dashboard.ytdReturnTitle'),
            value: 9.42,
            precision: 2,
            suffix: '%',
          }}
        />
        <StatisticCard
          colSpan={{ xs: 24, sm: 12, lg: 8 }}
          statistic={{
            title: t('dashboard.portfolioCountTitle'),
            value: 24,
          }}
        />
      </ProCard>

      <ProCard title={t('dashboard.systemStatusTitle')}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t('dashboard.apiHealthcheckLabel')}{' '}
          {isLoading
            ? t('dashboard.checking')
            : (data?.status ?? t('dashboard.unknown'))}
        </Typography.Paragraph>
      </ProCard>

      <ProCard title={t('dashboard.tableTitle')} bodyStyle={{ padding: 0 }}>
        <AppTable<PortfolioRow>
          dataSource={mockData}
          columns={columns}
          pagination={false}
          search={false}
        />
      </ProCard>
    </AppPage>
  );
}
