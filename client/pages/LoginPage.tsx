import { AuthFormContainer } from '@client/components/AuthFormContainer';
import { AuthLayout } from '@client/components/AuthLayout';
import { AuthSwitchLink } from '@client/components/AuthSwitchLink';
import { useValidation } from '@client/components/utils/validation';
import { useLoginMutation } from '@client/hooks/mutations/useAuthMutations';
import { Button, Loader, TextInput } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const { t } = useTranslation();
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
    <AuthLayout title={t('login.title')}>
      <AuthFormContainer>
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
                  label={t('login.username')}
                  placeholder={t('login.usernamePlaceholder')}
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
              onChange: validation.required('login.password'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  type="password"
                  label={t('login.password')}
                  placeholder={t('login.passwordPlaceholder')}
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
            disabled={loginMutation.isPending}
            fullWidth
            leftSection={loginMutation.isPending ? <Loader size="sm" /> : null}
          >
            {loginMutation.isPending ? t('login.signingIn') : t('login.signIn')}
          </Button>
        </form>

        <AuthSwitchLink
          messageKey="login.dontHaveAccount"
          linkKey="login.signUpHere"
          to="/register"
        />
      </AuthFormContainer>
    </AuthLayout>
  );
};

export default LoginPage;
