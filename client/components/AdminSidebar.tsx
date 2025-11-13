import { NavLink, ScrollArea } from '@mantine/core';
import { IconKey, IconShield, IconUser, IconUsers } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

interface AdminSidebarProps {
  onWidthChange?: (width: number) => void;
}

const AdminSidebar = ({ onWidthChange }: AdminSidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(200);
    }
  }, [onWidthChange]);

  const adminLinks = [
    {
      icon: IconUsers,
      label: t('admin.sidebar.users', { defaultValue: 'Users' }),
      path: '/admin/users',
    },
    {
      icon: IconShield,
      label: t('admin.sidebar.roles', { defaultValue: 'Roles' }),
      path: '/admin/roles',
    },
    {
      icon: IconKey,
      label: t('admin.sidebar.permissions', { defaultValue: 'Permissions' }),
      path: '/admin/permissions',
    },
    {
      icon: IconUser,
      label: t('admin.sidebar.sessions', { defaultValue: 'Sessions' }),
      path: '/admin/sessions',
    },
  ];

  const navbarStyles: React.CSSProperties = {
    position: 'fixed',
    top: 64,
    left: 0,
    height: 'calc(100vh - 64px)',
    width: 200,
    padding: 'var(--mantine-spacing-sm)',
    paddingTop: 'var(--mantine-spacing-md)',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--mantine-color-gray-3)',
    backgroundColor: 'var(--mantine-color-body)',
    zIndex: 30,
    overflow: 'hidden',
  };

  return (
    <nav style={navbarStyles}>
      <ScrollArea style={{ flex: 1 }}>
        {adminLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              label={link.label}
              active={location.pathname === link.path}
              onClick={() => navigate(link.path)}
              leftSection={<Icon size={18} stroke={1.5} />}
              style={{ fontSize: '14px' }}
            />
          );
        })}
      </ScrollArea>
    </nav>
  );
};

export default AdminSidebar;
