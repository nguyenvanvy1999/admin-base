import { Button, Card, Flex, List, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { AppDrawer } from 'src/components/common/AppDrawer';
import { PageHeader } from 'src/components/common/PageHeader';

const workstreams = [
  {
    id: 'ws-1',
    title: 'Chuẩn hoá dữ liệu',
    owner: 'Team Data',
    status: 'Đang chạy',
  },
  {
    id: 'ws-2',
    title: 'Tích hợp Custody',
    owner: 'Team Ops',
    status: 'Đang chờ',
  },
  {
    id: 'ws-3',
    title: 'Dashboard PnL',
    owner: 'Team Product',
    status: 'Thiết kế',
  },
];

export default function WorkspacePage() {
  const [open, setOpen] = useState(false);

  return (
    <Flex vertical gap={24}>
      <PageHeader
        title="Workspaces"
        subtitle="Trang ví dụ cho Drawer/Modal của Ant Design"
        extra={
          <Space>
            <Button onClick={() => setOpen(true)} type="primary">
              Tạo workspace
            </Button>
          </Space>
        }
      />
      <Card>
        <List
          dataSource={workstreams}
          renderItem={(item) => (
            <List.Item>
              <Flex
                align="center"
                justify="space-between"
                style={{ width: '100%' }}
              >
                <div>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                    {item.owner}
                  </Typography.Paragraph>
                </div>
                <Tag color="processing">{item.status}</Tag>
              </Flex>
            </List.Item>
          )}
        />
      </Card>

      <AppDrawer
        title="Workspace mới"
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Huỷ</Button>
            <Button type="primary" onClick={() => setOpen(false)}>
              Lưu
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph>
          Drawer này minh hoạ pattern tạo mới dữ liệu. Khi triển khai nghiệp vụ
          có thể nhúng Form ở đây.
        </Typography.Paragraph>
      </AppDrawer>
    </Flex>
  );
}
