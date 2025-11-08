import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const version = '1.0.0';

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Left side - Name and Version */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('footer.appName')} {t('footer.version', { version })}
              </span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {t('footer.allRightsReserved', { year: currentYear })}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
