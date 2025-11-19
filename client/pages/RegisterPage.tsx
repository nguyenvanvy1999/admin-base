import { AuthFormContainer } from '@client/components/AuthFormContainer';
import { AuthLayout } from '@client/components/AuthLayout';
import { AuthSwitchLink } from '@client/components/AuthSwitchLink';
import { Select } from '@client/components/Select';
import { ZodFormController } from '@client/components/ZodFormController';
import { useRegisterMutation } from '@client/hooks/mutations/useAuthMutations';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Loader, Stack, TextInput } from '@mantine/core';
import { RegisterDto } from '@server/dto/user.dto';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const schema = RegisterDto.extend({
  username: z.string().min(1, 'register.username'),
  password: z.string().min(6, 'register.passwordMinLength'),
  confirmPassword: z.string().min(1, 'register.confirmPasswordRequired'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'register.passwordsDoNotMatch',
  path: ['confirmPassword'],
});

const RegisterPage = () => {
  const { t } = useTranslation();
  const registerMutation = useRegisterMutation();
  const { data: currencies = [] } = useCurrenciesQuery();

  const { control, handleSubmit } = useZodForm({
    zod: schema,
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      baseCurrencyId: '',
    },
  });

  const onSubmitForm = handleSubmit((data) => {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      baseCurrencyId: data.baseCurrencyId,
    });
  });

  return (
    <AuthLayout title={t('register.title')}>
      <AuthFormContainer
        subtitle={t('register.createAccount')}
        description={t('register.joinUs')}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmitForm();
          }}
        >
          <Stack gap="md" mb="md">
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

            <ZodFormController
              control={control}
              name="baseCurrencyId"
              render={({ field, fieldState: { error } }) => (
                <Select
                  label={t('register.baseCurrency')}
                  placeholder={t('register.baseCurrencyPlaceholder')}
                  required
                  error={error}
                  items={currencies.map((currency) => ({
                    value: currency.id,
                    label: `${currency.symbol || ''} - ${currency.name} (${currency.code})`,
                  }))}
                  value={field.value || ''}
                  onChange={field.onChange}
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
