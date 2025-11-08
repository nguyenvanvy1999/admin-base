import type { ReactNode } from 'react';

interface AuthFormContainerProps {
  children: ReactNode;
  subtitle?: string;
  description?: string;
}

export const AuthFormContainer = ({
  children,
  subtitle,
  description,
}: AuthFormContainerProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700">
      {(subtitle || description) && (
        <div className="mb-6">
          {subtitle && (
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
              {subtitle}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
