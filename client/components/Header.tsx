import { ACCESS_TOKEN_KEY } from '@client/constants';
import useUserStore from '@client/store/user';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    // Close dropdown
    setIsDropdownOpen(false);

    // Navigate to login page
    navigate('/login');
  };

  const handleProfileClick = () => {
    // Close dropdown
    setIsDropdownOpen(false);

    // Navigate to profile page
    navigate('/profile');
  };

  const handleHomeClick = () => {
    // Navigate to home page
    navigate('/');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and App Name */}
          <button
            onClick={handleHomeClick}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-lg px-2 py-1"
          >
            <img
              src="/public/logo.jpeg"
              alt="Logo"
              className="h-10 w-10 rounded-full shadow-sm border-2 border-gray-100 dark:border-gray-700"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t('header.appName')}
              </h1>
            </div>
          </button>

          {/* Right side: Theme Toggle, Language Switcher and User Avatar */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* User Avatar and Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 transition duration-200"
              >
                <img
                  src="/public/logo.jpeg"
                  alt="User Avatar"
                  className="h-8 w-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
                />
                <div className="hidden sm:block text-left">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {user?.name || user?.username || ''}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('common.online')}
                  </p>
                </div>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
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

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  ></div>

                  {/* Dropdown Content */}
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user?.name || user?.username || ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.role || ''}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                    >
                      <svg
                        className="mr-3 h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {t('header.profile')}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                    >
                      <svg
                        className="mr-3 h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      {t('header.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
