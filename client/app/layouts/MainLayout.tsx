import {
  GithubOutlined,
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ProLayoutProps } from '@ant-design/pro-components';
import { PageContainer, ProLayout } from '@ant-design/pro-components';
import { Button, Dropdown, Flex } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const menuRoutes: ProLayoutProps['route'] = {
  routes: [
    { path: '/', name: 'Bảng điều khiển', icon: <HomeOutlined /> },
    { path: '/workspace', name: 'Workspaces', icon: <TeamOutlined /> },
    { path: '/settings', name: 'Cấu hình', icon: <SettingOutlined /> },
  ],
};

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const locationProps = useMemo(
    () => ({
      pathname: location.pathname,
    }),
    [location.pathname],
  );

  return (
    <ProLayout
      title="Investment Console"
      layout="mix"
      fixedHeader
      token={{
        header: {
          colorBgHeader: '#ffffff',
        },
        sider: {
          colorMenuBackground: '#ffffff',
        },
      }}
      route={menuRoutes}
      location={locationProps}
      menuItemRender={(item, dom) => (
        <div
          role="button"
          tabIndex={0}
          onClick={() => item.path && navigate(item.path)}
          onKeyDown={() => item.path && navigate(item.path)}
        >
          {dom}
        </div>
      )}
      actionsRender={() => [
        <Button
          key="github"
          type="text"
          icon={<GithubOutlined />}
          onClick={() => window.open('https://ant.design', '_blank')}
        />,
      ]}
      avatarProps={{
        src: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
        render: (props, dom) => (
          <Dropdown
            key="avatar"
            menu={{
              items: [
                { key: 'profile', label: 'Hồ sơ' },
                { key: 'logout', danger: true, label: 'Đăng xuất' },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
        title: 'Admin',
        size: 'small',
      }}
    >
      <PageContainer>
        <Flex vertical gap={24} style={{ minHeight: 'calc(100vh - 200px)' }}>
          <Outlet />
        </Flex>
      </PageContainer>
    </ProLayout>
  );
}
