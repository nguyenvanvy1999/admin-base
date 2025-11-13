import {
  ActionIcon,
  NavLink,
  ScrollArea,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconKey,
  IconShield,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

interface AdminSidebarProps {
  onWidthChange?: (width: number) => void;
}

const AdminSidebar = ({ onWidthChange }: AdminSidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(isCollapsed ? 80 : 256);
    }
  }, [isCollapsed, onWidthChange]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const getMainLinkStyles = (isActive: boolean): React.CSSProperties => ({
    width: 44,
    height: 44,
    borderRadius: 'var(--mantine-radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isActive
      ? 'var(--mantine-color-blue-7)'
      : 'var(--mantine-color-gray-7)',
    backgroundColor: isActive ? 'var(--mantine-color-blue-1)' : 'transparent',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    cursor: 'pointer',
  });

  const renderMainLinks = () =>
    adminLinks.map((link) => {
      const isActive = location.pathname === link.path;
      const Icon = link.icon;

      const button = (
        <UnstyledButton
          onClick={() => navigate(link.path)}
          style={getMainLinkStyles(isActive)}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor =
                'var(--mantine-color-gray-1)';
              e.currentTarget.style.color = 'var(--mantine-color-gray-9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--mantine-color-gray-7)';
            }
          }}
        >
          <Icon size={22} stroke={1.5} />
        </UnstyledButton>
      );

      return isCollapsed ? (
        <Tooltip
          label={link.label}
          position="right"
          withArrow
          transitionProps={{ duration: 0 }}
          key={link.path}
        >
          {button}
        </Tooltip>
      ) : (
        <div key={link.path}>{button}</div>
      );
    });

  const navbarStyles: React.CSSProperties = {
    position: 'fixed',
    top: 64,
    left: 0,
    height: 'calc(100vh - 64px)',
    width: isCollapsed ? 80 : 256,
    padding: isCollapsed
      ? 'var(--mantine-spacing-sm)'
      : 'var(--mantine-spacing-md)',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--mantine-color-gray-3)',
    backgroundColor: 'var(--mantine-color-body)',
    transition: 'width 0.2s ease',
    zIndex: 30,
    overflow: 'hidden',
  };

  const wrapperStyles: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    gap: 'var(--mantine-spacing-md)',
  };

  const asideStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--mantine-spacing-xs)',
    alignItems: 'center',
    paddingTop: 'var(--mantine-spacing-md)',
  };

  const mainStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  };

  const logoStyles: React.CSSProperties = {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--mantine-spacing-md)',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: 'var(--mantine-font-size-lg)',
    fontWeight: 700,
    marginBottom: 'var(--mantine-spacing-md)',
    padding: 'var(--mantine-spacing-xs) 0',
  };

  return (
    <>
      <nav style={navbarStyles}>
        <div style={wrapperStyles}>
          <div style={asideStyles}>
            <div style={logoStyles}>
              <img src="/public/logo.svg" alt="Logo" width={30} height={30} />
            </div>
            {renderMainLinks()}
            {isCollapsed && (
              <Tooltip
                label={t('sidebar.expand', { defaultValue: 'Expand' })}
                position="right"
                withArrow
              >
                <UnstyledButton
                  onClick={() => setIsCollapsed(false)}
                  style={{ ...getMainLinkStyles(false), marginTop: 'auto' }}
                >
                  <IconChevronLeft
                    size={22}
                    stroke={1.5}
                    style={{ transform: 'rotate(180deg)' }}
                  />
                </UnstyledButton>
              </Tooltip>
            )}
          </div>

          {!isCollapsed && (
            <div style={mainStyles}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Text style={{ ...titleStyles, flex: 1 }}>
                  {t('admin.sidebar.title', { defaultValue: 'Admin' })}
                </Text>
                <Tooltip
                  label={t('sidebar.collapse', { defaultValue: 'Collapse' })}
                  position="left"
                  withArrow
                >
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => setIsCollapsed(true)}
                  >
                    <IconChevronLeft size={16} />
                  </ActionIcon>
                </Tooltip>
              </div>

              <ScrollArea style={{ flex: 1 }}>
                {adminLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      label={link.label}
                      active={location.pathname === link.path}
                      onClick={() => navigate(link.path)}
                      leftSection={<Icon size={16} />}
                    />
                  );
                })}
              </ScrollArea>
            </div>
          )}
        </div>
      </nav>
      {isMobile && !isCollapsed && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 29,
          }}
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
