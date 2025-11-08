import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface AuthSwitchLinkProps {
  messageKey: string;
  linkKey: string;
  to: string;
}

export const AuthSwitchLink = ({
  messageKey,
  linkKey,
  to,
}: AuthSwitchLinkProps) => {
  const { t } = useTranslation();

  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t(messageKey)}{' '}
        <Link
          to={to}
          className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition duration-200"
        >
          {t(linkKey)}
        </Link>
      </p>
    </div>
  );
};
