import { Button } from '@client/components/ui/button';
import { FormInput } from '@client/components/ui/FormInput';
import { useValidation } from '@client/components/validation';
import { useLoginMutation } from '@client/hooks/mutations/useAuthMutations';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const LoginPage = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const loginMutation = useLoginMutation();
  const validation = useValidation();

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
    onSubmit: ({ value }) => {
      loginMutation.mutate({
        username: value.username,
        password: value.password,
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title Section */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/public/logo.jpeg"
              alt="Logo"
              className="h-20 w-20 rounded-full shadow-lg border-4 border-white dark:border-gray-800"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('login.title')}
          </h1>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="username"
              validators={{
                onChange: validation.required('login.username'),
              }}
            >
              {(field) => (
                <FormInput
                  field={field}
                  label={t('login.username')}
                  placeholder={t('login.usernamePlaceholder')}
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: validation.required('login.password'),
              }}
            >
              {(field) => (
                <FormInput
                  field={field}
                  type="password"
                  label={t('login.password')}
                  placeholder={t('login.passwordPlaceholder')}
                  required
                />
              )}
            </form.Field>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.signIn')
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('login.dontHaveAccount')}{' '}
              <Link
                to="/register"
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition duration-200"
              >
                {t('login.signUpHere')}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {t('common.copyright', { year: currentYear })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
