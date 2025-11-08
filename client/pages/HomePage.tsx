import useUserStore from '@client/store/user';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('home.welcomeBack', { username: user?.username })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('home.successfullyLogged')}
          </p>
        </div>

        {/* User Information Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('home.userInformation')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('home.userId')}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user?.id || t('common.nA')}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('home.username')}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user?.username || t('common.nA')}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('home.role')}
              </dt>
              <dd className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  {user?.role || t('common.nA')}
                </span>
              </dd>
            </div>
          </div>
        </div>

        {/* Template Features Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Hot Reload Feature */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('home.hotReloadTitle')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('home.hotReloadDescription')}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <code className="text-sm text-gray-800 dark:text-gray-200">
                bun run --watch src/index.ts
              </code>
            </div>
          </div>

          {/* Eden Treaty Feature */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('home.edenTreatyTitle')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('home.edenTreatyDescription')}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <code className="text-sm text-gray-800 dark:text-gray-200">
                api.api.users.login.post({'{'}) // Fully typed!
              </code>
            </div>
          </div>

          {/* Tailwind CSS Feature */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-cyan-600 dark:text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('home.tailwindTitle')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('home.tailwindDescription')}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <code className="text-sm text-gray-800 dark:text-gray-200">
                className="bg-indigo-600 hover:bg-indigo-700"
              </code>
            </div>
          </div>

          {/* Elysia Backend Feature */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('home.elysiaTitle')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('home.elysiaDescription')}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <code className="text-sm text-gray-800 dark:text-gray-200">
                app.get('/api/users', handler)
              </code>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t('home.quickActions')}
          </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() =>
                window.open(
                  'https://elysiajs.com/patterns/fullstack-dev-server.html',
                  '_blank',
                )
              }
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {t('home.documentation')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
