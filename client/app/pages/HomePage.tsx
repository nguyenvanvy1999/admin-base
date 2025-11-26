import type { ProColumns } from '@ant-design/pro-components';
import { AppTable } from '@client/components/common/AppTable';
import { PageHeader } from '@client/components/common/PageHeader';
import { useNotify } from '@client/hooks/useNotify';
import { useHealthcheckQuery } from '@client/services/healthcheck';
import { Button, Card, Col, Flex, Row, Statistic, Tag, Typography } from 'antd';

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
    title: 'Tài sản',
    dataIndex: 'asset',
  },
  {
    title: 'Phân bổ (%)',
    dataIndex: 'allocation',
    valueType: 'percent',
  },
  {
    title: 'Hiệu suất YTD (%)',
    dataIndex: 'performance',
    valueType: 'percent',
  },
  {
    title: 'Rủi ro',
    dataIndex: 'risk',
    valueEnum: {
      Low: { text: 'Thấp', status: 'Success' },
      Medium: { text: 'Trung bình', status: 'Processing' },
      High: { text: 'Cao', status: 'Error' },
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

  return (
    <Flex vertical gap={24}>
      <PageHeader
        title="Bảng điều khiển"
        subtitle="Kiến trúc base với Ant Design, React Query, Hash Router"
        extra={
          <Button
            type="primary"
            onClick={() =>
              notify.success('Thông báo mẫu đã được kích hoạt thành công.')
            }
          >
            Gửi thông báo mẫu
          </Button>
        }
      />

      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Tài sản quản lý (AUM)"
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
              title="Lợi nhuận YTD"
              value={9.42}
              precision={2}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Số lượng danh mục" value={24} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Typography.Title level={4}>Trạng thái hệ thống</Typography.Title>
        <Typography.Paragraph type="secondary">
          API healthcheck:{' '}
          {isLoading ? 'Đang kiểm tra...' : (data?.status ?? 'Chưa xác định')}
        </Typography.Paragraph>
      </Card>

      <Card>
        <AppTable<PortfolioRow>
          dataSource={mockData}
          columns={columns}
          headerTitle="Phân bổ danh mục mẫu"
          pagination={false}
          search={false}
        />
      </Card>
    </Flex>
  );
}
