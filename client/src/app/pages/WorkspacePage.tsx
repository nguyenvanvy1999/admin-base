import { ProCard, ProList } from '@ant-design/pro-components';
import { Button, Space, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { AppDrawer } from 'src/components/common/AppDrawer';
import { AppPage } from 'src/components/common/AppPage';

type Workstream = {
  id: string;
  title: string;
  owner: string;
  status: string;
};

const workstreams: Workstream[] = [
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
    <AppPage
      title="Workspaces"
      subtitle="Trang ví dụ cho Drawer/Modal của Ant Design"
      extra={
        <Space>
          <Button onClick={() => setOpen(true)} type="primary">
            Tạo workspace
          </Button>
        </Space>
      }
    >
      <ProCard>
        <ProList<Workstream>
          rowKey="id"
          split
          dataSource={workstreams}
          metas={{
            title: {
              dataIndex: 'title',
              render: (dom: ReactNode) => (
                <Typography.Text strong>{dom}</Typography.Text>
              ),
            },
            description: {
              render: (_, record) => (
                <Typography.Text type="secondary">
                  {record.owner}
                </Typography.Text>
              ),
            },
            extra: {
              render: (_: ReactNode, record: Workstream) => (
                <Tag color="processing">{record.status}</Tag>
              ),
            },
          }}
        />
      </ProCard>

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
    </AppPage>
  );
}
