import { FormTextInput } from '@client/components/ui/FormTextInput';
import { useValidation } from '@client/components/validation';
import { useRegisterMutation } from '@client/hooks/mutations/useAuthMutations';
import { Button, Loader } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const RegisterPage = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const registerMutation = useRegisterMutation();
  const validation = useValidation();

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: ({ value }) => {
      registerMutation.mutate({
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
            {t('register.title')}
          </h1>
        </div>

        {/* Register Form */}
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
              {t('register.createAccount')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
              {t('register.joinUs')}
            </p>
          </div>

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
                <FormTextInput
                  field={field}
                  label={t('register.username')}
                  placeholder={t('register.usernamePlaceholder')}
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  if (!value || (typeof value === 'string' && !value.trim())) {
                    return t('register.passwordRequired');
                  }
                  if (typeof value === 'string' && value.length < 6) {
                    return t('register.passwordMinLength');
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <FormTextInput
                  field={field}
                  type="password"
                  label={t('register.password')}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="confirmPassword"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  if (!value || (typeof value === 'string' && !value.trim())) {
                    return t('register.confirmPasswordRequired');
                  }
                  const password = fieldApi.form.getFieldValue('password');
                  if (typeof value === 'string' && value !== password) {
                    return t('register.passwordsDoNotMatch');
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <FormTextInput
                  field={field}
                  type="password"
                  label={t('register.confirmPassword')}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  required
                />
              )}
            </form.Field>

            {/* Terms and Conditions */}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              fullWidth
              leftSection={
                registerMutation.isPending ? <Loader size="sm" /> : null
              }
            >
              {registerMutation.isPending
                ? t('register.creatingAccount')
                : t('register.createAccountButton')}
            </Button>
          </form>

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('register.alreadyHaveAccount')}{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition duration-200"
              >
                {t('register.signInHere')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {t('common.copyright', { year: currentYear })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
