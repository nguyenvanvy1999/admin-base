import {
  GithubOutlined,
  HomeOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import type { MenuDataItem, ProLayoutProps } from '@ant-design/pro-components';
import { PageContainer, ProLayout } from '@ant-design/pro-components';
import { Button, Dropdown, Switch, Tooltip } from 'antd';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from 'src/components/LanguageSwitcher';
import { useAuth } from 'src/hooks/auth/useAuth';
import { useThemeMode } from '../providers/ThemeModeProvider';

type RouteConfig = NonNullable<ProLayoutProps['route']>;

const BASE_ROUTES: MenuDataItem[] = [
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

const ADMIN_USERS_ROUTE: MenuDataItem = {
  path: '/admin/users',
  name: 'sidebar.adminUsers',
  icon: <UserSwitchOutlined />,
};

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n: _ } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const { user, logout } = useAuth();
  const canViewAdminUsers = user?.permissions?.includes('USER.VIEW');

  const menuRoutes = useMemo<RouteConfig>(() => {
    const routes = canViewAdminUsers
      ? [...BASE_ROUTES, ADMIN_USERS_ROUTE]
      : BASE_ROUTES;

    return {
      path: '/',
      routes,
    };
  }, [canViewAdminUsers]);

  const translateMenu = useCallback(
    (items: MenuDataItem[]): MenuDataItem[] =>
      items.map((item) => {
        const labelKey = typeof item.name === 'string' ? item.name : '';
        const localizedName = labelKey ? t(labelKey as any) : item.name;

        return {
          ...item,
          name: localizedName,
          children: item.children ? translateMenu(item.children) : undefined,
        };
      }),
    [t],
  );

  const localizedRoutes = useMemo<RouteConfig>(
    () => ({
      ...menuRoutes,
      routes: translateMenu(menuRoutes.routes || []),
    }),
    [menuRoutes, translateMenu],
  );

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
      fixSiderbar
      fixedHeader
      route={localizedRoutes}
      location={locationProps}
      menuItemRender={(item, dom) =>
        item.path ? <Link to={item.path}>{dom}</Link> : dom
      }
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
      menuHeaderRender={() => (
        <Button type="text" onClick={() => navigate('/')}>
          {t('header.appName')}
        </Button>
      )}
      appList={[
        {
          title: t('sidebar.dashboard'),
          icon: <HomeOutlined />,
          desc: t('common.viewDetails'),
          url: '/',
        },
      ]}
    >
      <PageContainer>
        <Outlet />
      </PageContainer>
    </ProLayout>
  );
}
