import { NavLink, ScrollArea } from '@mantine/core';
import {
  IconBuilding,
  IconBulb,
  IconCalendar,
  IconCategory,
  IconChartBar,
  IconCoins,
  IconCreditCard,
  IconHome,
  IconPlus,
  IconTag,
  IconTrendingUp,
  IconWallet,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

interface SidebarProps {
  onWidthChange?: (width: number) => void;
}

const Sidebar = ({ onWidthChange }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(200);
    }
  }, [onWidthChange]);

  const allLinks = [
    {
      icon: IconHome,
      label: t('sidebar.dashboard'),
      path: '/',
    },
    {
      icon: IconCreditCard,
      label: t('sidebar.transactionsList', { defaultValue: 'Transactions' }),
      path: '/transactions',
    },
    {
      icon: IconCreditCard,
      label: t('sidebar.debts', { defaultValue: 'Debts' }),
      path: '/debts',
    },
    {
      icon: IconPlus,
      label: t('sidebar.bulkAddTransactions', { defaultValue: 'Bulk Add' }),
      path: '/transactions/bulk',
    },
    {
      icon: IconCoins,
      label: t('sidebar.budgets'),
      path: '/budgets',
    },
    {
      icon: IconWallet,
      label: t('sidebar.accounts'),
      path: '/accounts',
    },
    {
      icon: IconTrendingUp,
      label: t('sidebar.investments'),
      path: '/investments',
    },
    {
      icon: IconCategory,
      label: t('sidebar.categories'),
      path: '/categories',
    },
    {
      icon: IconBuilding,
      label: t('sidebar.entities'),
      path: '/entities',
    },
    {
      icon: IconCalendar,
      label: t('sidebar.events'),
      path: '/events',
    },
    {
      icon: IconTag,
      label: t('sidebar.tags'),
      path: '/tags',
    },
    {
      icon: IconBulb,
      label: t('sidebar.rules'),
      path: '/rules',
    },
    {
      icon: IconChartBar,
      label: t('sidebar.incomeExpenseStatistics', {
        defaultValue: 'Income/Expense',
      }),
      path: '/statistics/income-expense',
    },
    {
      icon: IconChartBar,
      label: t('sidebar.investmentStatistics', { defaultValue: 'Investment' }),
      path: '/statistics/investments',
    },
    {
      icon: IconChartBar,
      label: t('sidebar.debtStatistics', { defaultValue: 'Debt' }),
      path: '/statistics/debts',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

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
        {allLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              label={link.label}
              active={isActive(link.path)}
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

export default Sidebar;
