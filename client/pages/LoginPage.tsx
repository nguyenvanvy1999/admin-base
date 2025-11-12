import { AuthFormContainer } from '@client/components/AuthFormContainer';
import { AuthLayout } from '@client/components/AuthLayout';
import { AuthSwitchLink } from '@client/components/AuthSwitchLink';
import { TextInput } from '@client/components/TextInput';
import { ZodFormController } from '@client/components/ZodFormController';
import { useLoginMutation } from '@client/hooks/mutations/useAuthMutations';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Loader, Stack } from '@mantine/core';
import { LoginDto } from '@server/dto/user.dto';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const schema = LoginDto.extend({
  username: z.string().min(1, 'login.username'),
  password: z.string().min(1, 'login.password'),
});

const LoginPage = () => {
  const { t } = useTranslation();
  const loginMutation = useLoginMutation();

  const { control, handleSubmit } = useZodForm({
    zod: schema,
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmitForm = handleSubmit((data) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    });
  });

  return (
    <AuthLayout title={t('login.title')}>
      <AuthFormContainer>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmitForm();
          }}
        >
          <Stack gap="md">
            <ZodFormController
              control={control}
              name="username"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  label={t('login.username')}
                  placeholder={t('login.usernamePlaceholder')}
                  required
                  error={error}
                  {...field}
                />
              )}
            />

            <ZodFormController
              control={control}
              name="password"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  type="password"
                  label={t('login.password')}
                  placeholder={t('login.passwordPlaceholder')}
                  required
                  error={error}
                  {...field}
                />
              )}
            />
          </Stack>

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
