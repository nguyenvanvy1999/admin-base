import {
  GithubOutlined,
  HomeOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Button, Dropdown, Switch, Tooltip } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';
import { LanguageSwitcher } from 'src/components/LanguageSwitcher';
import { useAuth } from 'src/hooks/auth/useAuth';
import { useThemeMode } from '../providers/ThemeModeProvider';

export default function MainLayout() {
  const location = useLocation();
  const { t, i18n: _ } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const { user, logout } = useAuth();
  const canViewAdminUsers = user?.permissions?.includes('USER.VIEW');

  const menuRoutes = useMemo(() => {
    const baseRoutes = [
      { path: '/', name: 'sidebar.dashboard', icon: <HomeOutlined /> },
      {
        path: '/workspace',
        name: 'sidebar.workspaces',
        icon: <TeamOutlined />,
      },
      {
        path: '/settings',
        name: 'sidebar.settings',
        icon: <SettingOutlined />,
      },
    ];

    if (canViewAdminUsers) {
      baseRoutes.push({
        path: '/admin/users',
        name: 'sidebar.adminUsers',
        icon: <UserSwitchOutlined />,
      });
    }

    return { routes: baseRoutes };
  }, [canViewAdminUsers]);

  const locationProps = useMemo(
    () => ({
      pathname: location.pathname,
    }),
    [location.pathname],
  );

  return (
    <ProLayout
      title={t('header.appName')}
      layout="mix"
      fixedHeader
      route={menuRoutes}
      location={locationProps}
      actionsRender={() => [
        <Tooltip
          key="theme"
          title={mode === 'dark' ? t('common.enabled') : t('common.disabled')}
        >
          <Switch
            checked={mode === 'dark'}
            onChange={(checked) => setMode(checked ? 'dark' : 'light')}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
          />
        </Tooltip>,
        <LanguageSwitcher key="lang" size="small" />,
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
                { key: 'profile', label: t('header.profile') },
                { key: 'logout', danger: true, label: t('header.logout') },
              ],
              onClick: async ({ key }) => {
                if (key === 'logout') {
                  await logout();
                }
              },
            }}
          >
            {dom}
          </Dropdown>
        ),
        title: user?.name ?? user?.email ?? 'Admin',
        size: 'small',
      }}
    >
      <Outlet />
    </ProLayout>
  );
}
