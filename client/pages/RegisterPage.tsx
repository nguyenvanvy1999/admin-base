import { AuthFormContainer } from '@client/components/AuthFormContainer';
import { AuthLayout } from '@client/components/AuthLayout';
import { AuthSwitchLink } from '@client/components/AuthSwitchLink';
import { TextInput } from '@client/components/TextInput';
import { ZodFormController } from '@client/components/ZodFormController';
import { useRegisterMutation } from '@client/hooks/mutations/useAuthMutations';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Loader, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const schema = z
  .object({
    username: z.string().min(1, 'register.username'),
    password: z.string().min(6, 'register.passwordMinLength'),
    confirmPassword: z.string().min(1, 'register.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'register.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

type FormValue = z.infer<typeof schema>;

const RegisterPage = () => {
  const { t } = useTranslation();
  const registerMutation = useRegisterMutation();

  const { control, handleSubmit } = useZodForm({
    zod: schema,
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmitForm = handleSubmit((data) => {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
    });
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
            onSubmitForm();
          }}
        >
          <Stack gap="md">
            <ZodFormController
              control={control}
              name="username"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  label={t('register.username')}
                  placeholder={t('register.usernamePlaceholder')}
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
                  label={t('register.password')}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  error={error}
                  {...field}
                />
              )}
            />

            <ZodFormController
              control={control}
              name="confirmPassword"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  type="password"
                  label={t('register.confirmPassword')}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  required
                  error={error}
                  {...field}
                />
              )}
            />
          </Stack>

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
