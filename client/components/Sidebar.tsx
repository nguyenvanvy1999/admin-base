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
        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  const iconClass = 'w-5 h-5 flex-shrink-0';

  return (
    <>
      <div
        className={`fixed top-16 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex-shrink-0 z-30 ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${isMobile && isCollapsed ? 'hidden' : ''}`}
        style={{ height: 'calc(100vh - 64px)' }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-end p-4 border-b border-gray-200 dark:border-gray-700 min-h-[64px] relative">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors absolute right-2"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
                />
              </svg>
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
              <svg
                className={iconClass}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.dashboard')}</span>
              )}
            </NavLink>

            <NavLink
              to="/transactions"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <svg
                className={iconClass}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.transactions')}</span>
              )}
            </NavLink>

            <NavLink
              to="/budgets"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <svg
                className={iconClass}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.budgets')}</span>
              )}
            </NavLink>

            <NavLink
              to="/accounts"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <svg
                className={iconClass}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.accounts')}</span>
              )}
            </NavLink>

            <NavLink
              to="/investments"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <svg
                className={iconClass}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {!isCollapsed && (
                <span className="ml-3 flex-1">{t('sidebar.investments')}</span>
              )}
            </NavLink>

            {!isCollapsed && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={toggleSubMenu}
                  className={`w-full ${menuItemClass(false)}`}
                >
                  <svg
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="ml-3 flex-1 text-left">
                    {t('sidebar.meta')}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isSubMenuOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isSubMenuOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    <NavLink
                      to="/categories"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <svg
                        className={iconClass}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="ml-3">{t('sidebar.categories')}</span>
                    </NavLink>

                    <NavLink
                      to="/entities"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <svg
                        className={iconClass}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <span className="ml-3">{t('sidebar.entities')}</span>
                    </NavLink>

                    <NavLink
                      to="/tags"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <svg
                        className={iconClass}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="ml-3">{t('sidebar.tags')}</span>
                    </NavLink>

                    <NavLink
                      to="/rules"
                      className={({ isActive }) => menuItemClass(isActive)}
                    >
                      <svg
                        className={iconClass}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      <span className="ml-3">{t('sidebar.rules')}</span>
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {isCollapsed && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <NavLink
                  to="/categories"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.categories')}
                >
                  <svg
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </NavLink>
                <NavLink
                  to="/entities"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.entities')}
                >
                  <svg
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </NavLink>
                <NavLink
                  to="/tags"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.tags')}
                >
                  <svg
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </NavLink>
                <NavLink
                  to="/rules"
                  className={({ isActive }) => menuItemClass(isActive)}
                  title={t('sidebar.rules')}
                >
                  <svg
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </NavLink>
              </div>
            )}

            <NavLink
              to="/statistics"
              className={({ isActive }) => menuItemClass(isActive)}
            >
              <svg
                className={iconClass}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
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
