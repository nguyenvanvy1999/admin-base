import { AuthFormContainer } from '@client/components/AuthFormContainer';
import { AuthLayout } from '@client/components/AuthLayout';
import { AuthSwitchLink } from '@client/components/AuthSwitchLink';
import { useValidation } from '@client/components/utils/validation';
import { useRegisterMutation } from '@client/hooks/mutations/useAuthMutations';
import { Button, Loader, TextInput } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';

const RegisterPage = () => {
  const { t } = useTranslation();
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
    <AuthLayout title={t('register.title')}>
      <AuthFormContainer
        subtitle={t('register.createAccount')}
        description={t('register.joinUs')}
      >
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
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('register.username')}
                  placeholder={t('register.usernamePlaceholder')}
                  required
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
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
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  type="password"
                  label={t('register.password')}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
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
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  type="password"
                  label={t('register.confirmPassword')}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  required
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

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

        <AuthSwitchLink
          messageKey="register.alreadyHaveAccount"
          linkKey="register.signInHere"
          to="/login"
        />
      </AuthFormContainer>
    </AuthLayout>
  );
};

export default RegisterPage;
