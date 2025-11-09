import {
  AccountBalance,
  BarChart,
  Business,
  Category,
  ChevronLeft,
  CreditCard,
  Home,
  KeyboardArrowDown,
  Label,
  Lightbulb,
  Rule,
  Savings,
  Settings,
  Tag,
  TrendingUp,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

interface SidebarProps {
  onWidthChange?: (width: number) => void;
}

const Sidebar = ({ onWidthChange }: SidebarProps) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(isCollapsed ? 64 : 256);
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

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSubMenu = () => {
    setIsSubMenuOpen(!isSubMenuOpen);
  };

  const menuItemClass = (isActive: boolean) =>
    `flex items-center text-sm font-medium rounded-lg transition-colors duration-200 ${
      isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
    } ${
      isActive
        ? 'bg-[hsl(var(--color-primary-light))] dark:bg-[hsl(var(--color-primary-dark))] text-[hsl(var(--color-primary))] dark:text-[hsl(var(--color-primary))]'
        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
    }`;

  const iconClass = 'w-5 h-5 flex-shrink-0';

  return (
    <>
      <div
        className={`fixed top-16 left-0 bg-white dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 transition-all duration-300 flex-shrink-0 z-30 ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${isMobile && isCollapsed ? 'hidden' : ''}`}
        style={{ height: 'calc(100vh - 64px)' }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-end p-4 border-b border-gray-200 dark:border-gray-600 min-h-[64px] relative">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors absolute right-2"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300 rotate-180" />
              )}
            </button>
          </div>

          <nav
            className={`sidebar-nav flex-1 overflow-y-auto overflow-x-hidden space-y-1 ${
              isCollapsed ? 'px-2 py-4' : 'p-4'
            }`}
          >
            <NavLink
              to="/"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <Home className={iconClass} />
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.dashboard')}</span>
              )}
            </NavLink>

            <NavLink
              to="/transactions"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <CreditCard className={iconClass} />
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.transactions')}</span>
              )}
            </NavLink>

            <NavLink
              to="/budgets"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <Savings className={iconClass} />
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.budgets')}</span>
              )}
            </NavLink>

            <NavLink
              to="/accounts"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <AccountBalance className={iconClass} />
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.accounts')}</span>
              )}
            </NavLink>

            <NavLink
              to="/investments"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <TrendingUp className={iconClass} />
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.investments')}</span>
              )}
            </NavLink>

            {!isCollapsed && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={toggleSubMenu}
                  className={`w-full ${menuItemClass(false)}`}
                >
                  <Settings className={iconClass} />
                  <span className="ml-3 flex-1 text-left">
                    {t('sidebar.meta')}
                  </span>
                  <KeyboardArrowDown
                    className={`w-4 h-4 transition-transform ${
                      isSubMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isSubMenuOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    <NavLink
                      to="/categories"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <Category className={iconClass} />
                      <span className="ml-3">{t('sidebar.categories')}</span>
                    </NavLink>

                    <NavLink
                      to="/entities"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <Business className={iconClass} />
                      <span className="ml-3">{t('sidebar.entities')}</span>
                    </NavLink>

                    <NavLink
                      to="/tags"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <Tag className={iconClass} />
                      <span className="ml-3">{t('sidebar.tags')}</span>
                    </NavLink>

                    <NavLink
                      to="/rules"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <Rule className={iconClass} />
                      <span className="ml-3">{t('sidebar.rules')}</span>
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {isCollapsed && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                <NavLink
                  to="/categories"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.categories')}
                >
                  <Label className={iconClass} />
                </NavLink>
                <NavLink
                  to="/entities"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.entities')}
                >
                  <Business className={iconClass} />
                </NavLink>
                <NavLink
                  to="/tags"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.tags')}
                >
                  <Label className={iconClass} />
                </NavLink>
                <NavLink
                  to="/rules"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.rules')}
                >
                  <Lightbulb className={iconClass} />
                </NavLink>
              </div>
            )}

            <NavLink
              to="/statistics"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <BarChart className={iconClass} />
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.statistics')}</span>
              )}
            </NavLink>
          </nav>
        </div>
      </div>
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;
