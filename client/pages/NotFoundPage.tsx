import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const NotFoundPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300 dark:text-gray-700">
            404
          </h1>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {t('notFound.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          {t('notFound.description')}
        </p>
        <button
          onClick={handleGoHome}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary-hover))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--color-primary))] transition duration-200"
        >
          {t('notFound.goHome')}
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
