import {
  ActionIcon,
  Collapse,
  NavLink,
  ScrollArea,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconBuilding,
  IconBulb,
  IconCalendar,
  IconCategory,
  IconChartBar,
  IconChevronLeft,
  IconCoins,
  IconCreditCard,
  IconHome,
  IconPlus,
  IconSettings,
  IconTag,
  IconTrendingUp,
  IconWallet,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

interface SidebarProps {
  onWidthChange?: (width: number) => void;
}

const Sidebar = ({ onWidthChange }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [transactionsOpened, setTransactionsOpened] = useState(false);
  const [metaOpened, setMetaOpened] = useState(false);
  const [statisticsOpened, setStatisticsOpened] = useState(false);

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

  const getActiveSection = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/transactions')) return 'transactions';
    if (path.startsWith('/budgets')) return 'budgets';
    if (path.startsWith('/accounts')) return 'accounts';
    if (path.startsWith('/investments')) return 'investments';
    if (
      path.startsWith('/categories') ||
      path.startsWith('/entities') ||
      path.startsWith('/events') ||
      path.startsWith('/tags') ||
      path.startsWith('/rules')
    ) {
      return 'meta';
    }
    if (path.startsWith('/statistics')) return 'statistics';
    return 'dashboard';
  };

  const activeSection = getActiveSection();

  const mainLinks = [
    {
      icon: IconHome,
      label: t('sidebar.dashboard'),
      section: 'dashboard',
      path: '/',
    },
    {
      icon: IconCreditCard,
      label: t('sidebar.transactions'),
      section: 'transactions',
      path: '/transactions',
    },
    {
      icon: IconCoins,
      label: t('sidebar.budgets'),
      section: 'budgets',
      path: '/budgets',
    },
    {
      icon: IconWallet,
      label: t('sidebar.accounts'),
      section: 'accounts',
      path: '/accounts',
    },
    {
      icon: IconTrendingUp,
      label: t('sidebar.investments'),
      section: 'investments',
      path: '/investments',
    },
    {
      icon: IconSettings,
      label: t('sidebar.meta'),
      section: 'meta',
      path: '/categories',
    },
    {
      icon: IconChartBar,
      label: t('sidebar.statistics'),
      section: 'statistics',
      path: '/statistics/income-expense',
    },
  ];

  const transactionLinks = [
    {
      label: t('sidebar.transactionsList', { defaultValue: 'Transactions' }),
      path: '/transactions',
    },
    {
      label: t('sidebar.debts', { defaultValue: 'Debts' }),
      path: '/debts',
    },
    {
      label: t('sidebar.bulkAddTransactions', { defaultValue: 'Bulk Add' }),
      path: '/transactions/bulk',
    },
  ];

  const metaLinks = [
    {
      label: t('sidebar.categories'),
      path: '/categories',
      icon: IconCategory,
    },
    {
      label: t('sidebar.entities'),
      path: '/entities',
      icon: IconBuilding,
    },
    {
      label: t('sidebar.events'),
      path: '/events',
      icon: IconCalendar,
    },
    {
      label: t('sidebar.tags'),
      path: '/tags',
      icon: IconTag,
    },
    {
      label: t('sidebar.rules'),
      path: '/rules',
      icon: IconBulb,
    },
  ];

  const statisticsLinks = [
    {
      label: t('sidebar.incomeExpenseStatistics', {
        defaultValue: 'Income/Expense',
      }),
      path: '/statistics/income-expense',
    },
    {
      label: t('sidebar.investmentStatistics', { defaultValue: 'Investment' }),
      path: '/statistics/investments',
    },
    {
      label: t('sidebar.debtStatistics', { defaultValue: 'Debt' }),
      path: '/statistics/debts',
    },
  ];

  const handleMainLinkClick = (link: (typeof mainLinks)[0]) => {
    if (link.section === 'transactions') {
      setTransactionsOpened(!transactionsOpened);
      if (!transactionsOpened) {
        navigate('/transactions');
      }
    } else if (link.section === 'meta') {
      setMetaOpened(!metaOpened);
      if (!metaOpened) {
        navigate('/categories');
      }
    } else if (link.section === 'statistics') {
      setStatisticsOpened(!statisticsOpened);
      if (!statisticsOpened) {
        navigate('/statistics/income-expense');
      }
    } else {
      navigate(link.path);
    }
  };

  const renderMainLinks = () =>
    mainLinks.map((link) => {
      const isActive = activeSection === link.section;
      const Icon = link.icon;

      const button = (
        <UnstyledButton
          onClick={() => handleMainLinkClick(link)}
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
          key={link.section}
        >
          {button}
        </Tooltip>
      ) : (
        <div key={link.section}>{button}</div>
      );
    });

  const renderSubLinks = (
    links: Array<{ label: string; path: string }>,
    basePath: string,
  ) =>
    links.map((link) => (
      <NavLink
        key={link.path}
        label={link.label}
        active={location.pathname === link.path}
        onClick={() => navigate(link.path)}
        leftSection={
          link.path === '/transactions/bulk' ? (
            <IconPlus size={16} />
          ) : (
            <IconCreditCard size={16} />
          )
        }
      />
    ));

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'transactions':
        return t('sidebar.transactions');
      case 'meta':
        return t('sidebar.meta');
      case 'statistics':
        return t('sidebar.statistics');
      default:
        return t('sidebar.dashboard');
    }
  };

  const renderSectionContent = () => {
    if (isCollapsed) return null;

    switch (activeSection) {
      case 'transactions':
        return (
          <>
            <Collapse in={transactionsOpened}>
              {renderSubLinks(transactionLinks, '/transactions')}
            </Collapse>
          </>
        );
      case 'meta':
        return (
          <>
            <Collapse in={metaOpened}>
              {metaLinks.map((link) => {
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
            </Collapse>
          </>
        );
      case 'statistics':
        return (
          <>
            <Collapse in={statisticsOpened}>
              {renderSubLinks(statisticsLinks, '/statistics')}
            </Collapse>
          </>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!isCollapsed) {
      if (activeSection === 'transactions') {
        setTransactionsOpened(true);
      } else if (activeSection === 'meta') {
        setMetaOpened(true);
      } else if (activeSection === 'statistics') {
        setStatisticsOpened(true);
      }
    }
  }, [activeSection, isCollapsed]);

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
                  {getSectionTitle()}
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
                {renderSectionContent()}
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

export default Sidebar;
