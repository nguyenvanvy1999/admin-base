import {
  GithubOutlined,
  GlobalOutlined,
  HomeOutlined,
  MobileOutlined,
  MoonOutlined,
  SafetyOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import type { MenuDataItem, ProLayoutProps } from '@ant-design/pro-components';
import { ProLayout } from '@ant-design/pro-components';
import { Button, Dropdown, Switch, Tooltip } from 'antd';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LanguageSwitcher } from 'src/components/LanguageSwitcher';
import { useAuth } from 'src/hooks/auth/useAuth';
import { useThemeMode } from '../providers/ThemeModeProvider';

type RouteConfig = NonNullable<ProLayoutProps['route']>;

const BASE_ROUTES: MenuDataItem[] = [
  { path: '/', name: 'sidebar.dashboard', icon: <HomeOutlined /> },
  {
    path: '/me/sessions',
    name: 'sidebar.mySessions',
    icon: <MobileOutlined />,
  },
];

const ADMIN_USERS_ROUTE: MenuDataItem = {
  path: '/admin/users',
  name: 'sidebar.adminUsers',
  icon: <UserSwitchOutlined />,
};

const ADMIN_ROLES_ROUTE: MenuDataItem = {
  path: '/admin/roles',
  name: 'sidebar.adminRoles',
  icon: <SafetyOutlined />,
};

const ADMIN_PERMISSIONS_ROUTE: MenuDataItem = {
  path: '/admin/permissions',
  name: 'sidebar.adminPermissions',
  icon: <SafetyOutlined />,
};

const ADMIN_SESSIONS_ROUTE: MenuDataItem = {
  path: '/admin/sessions',
  name: 'sidebar.adminSessions',
  icon: <TeamOutlined />,
};

const ADMIN_SETTINGS_ROUTE: MenuDataItem = {
  path: '/admin/settings',
  name: 'sidebar.adminSettings',
  icon: <SettingOutlined />,
};

const ADMIN_I18N_ROUTE: MenuDataItem = {
  path: '/admin/i18n',
  name: 'sidebar.adminI18n',
  icon: <GlobalOutlined />,
};

const ADMIN_USER_IP_WHITELISTS_ROUTE: MenuDataItem = {
  path: '/admin/user-ip-whitelists',
  name: 'sidebar.adminUserIpWhitelists',
  icon: <SafetyOutlined />,
};

export default function MainLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const { user, logout } = useAuth();
  const canViewAdminUsers = user?.permissions?.includes('USER.VIEW');
  const canViewRoles = user?.permissions?.includes('ROLE.VIEW');
  const canViewSettings = user?.permissions?.includes('SETTING.VIEW');
  const canViewSessions = user?.permissions?.includes('SESSION.VIEW');
  const canViewI18n = user?.permissions?.includes('I18N.VIEW');
  const canViewUserIpWhitelists =
    user?.permissions?.includes('IPWHITELIST.VIEW');

  const menuRoutes = useMemo<RouteConfig>(() => {
    const adminRoutes: MenuDataItem[] = [];

    if (canViewAdminUsers) {
      adminRoutes.push(ADMIN_USERS_ROUTE);
    }

    if (canViewRoles) {
      adminRoutes.push(ADMIN_ROLES_ROUTE);
      adminRoutes.push(ADMIN_PERMISSIONS_ROUTE);
    }

    if (canViewSettings) {
      adminRoutes.push(ADMIN_SETTINGS_ROUTE);
    }

    if (canViewSessions) {
      adminRoutes.push(ADMIN_SESSIONS_ROUTE);
    }

    if (canViewI18n) {
      adminRoutes.push(ADMIN_I18N_ROUTE);
    }

    if (canViewUserIpWhitelists) {
      adminRoutes.push(ADMIN_USER_IP_WHITELISTS_ROUTE);
    }

    return {
      path: '/',
      routes: [...BASE_ROUTES, ...adminRoutes],
    };
  }, [
    canViewAdminUsers,
    canViewRoles,
    canViewSettings,
    canViewSessions,
    canViewI18n,
    canViewUserIpWhitelists,
  ]);

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
        render: (_, dom) => (
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
      logo={
        <img
          src="/logo.svg"
          alt="Admin Portal"
          style={{ height: '32px', marginRight: '8px' }}
        />
      }
      menuHeaderRender={() => null}
    >
      <Outlet />
    </ProLayout>
  );
}
