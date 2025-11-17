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
        {t(messageKey as any)}{' '}
        <Link
          to={to}
          className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition duration-200"
        >
          {t(linkKey as any)}
        </Link>
      </p>
    </div>
  );
};
