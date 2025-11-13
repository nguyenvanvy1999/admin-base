import { PageContainer } from '@client/components/PageContainer';
import { Select } from '@client/components/Select';
import { ZodFormController } from '@client/components/ZodFormController';
import { useUpdateProfileMutation } from '@client/hooks/mutations/useProfileMutations';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useUserQuery } from '@client/hooks/queries/useUserQuery';
import { useZodForm } from '@client/hooks/useZodForm';
import {
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { UpdateProfileDto } from '@server/dto/user.dto';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const profileSchema = z.preprocess(
  (data) => {
    if (typeof data === 'object' && data !== null) {
      const processed = { ...data };
      if (
        typeof processed.oldPassword === 'string' &&
        processed.oldPassword.trim() === ''
      ) {
        processed.oldPassword = undefined;
      }
      if (
        typeof processed.newPassword === 'string' &&
        processed.newPassword.trim() === ''
      ) {
        processed.newPassword = undefined;
      }
      if (
        typeof processed.confirmPassword === 'string' &&
        processed.confirmPassword.trim() === ''
      ) {
        processed.confirmPassword = undefined;
      }
      return processed;
    }
    return data;
  },
  UpdateProfileDto.extend({
    confirmPassword: z.string().optional(),
  })
    .refine(
      (data) => {
        if (data.newPassword && !data.oldPassword) {
          return false;
        }
        return true;
      },
      {
        message: 'profile.oldPasswordRequired',
        path: ['oldPassword'],
      },
    )
    .refine(
      (data) => {
        if (data.newPassword && data.newPassword !== data.confirmPassword) {
          return false;
        }
        return true;
      },
      {
        message: 'profile.passwordsDoNotMatch',
        path: ['confirmPassword'],
      },
    ),
);

type FormValue = z.infer<typeof profileSchema>;

const ProfilePage = () => {
  const { t } = useTranslation();
  const { data: user, isLoading } = useUserQuery();
  const { data: currencies = [] } = useCurrenciesQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const [isEditMode, setIsEditMode] = useState(false);

  const defaultValues: FormValue = {
    name: '',
    baseCurrencyId: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  const { control, handleSubmit, reset, watch } = useZodForm({
    zod: profileSchema,
    defaultValues,
  });

  const newPasswordValue = watch('newPassword');

  useEffect(() => {
    if (user && !isEditMode) {
      reset({
        name: user.name || '',
        baseCurrencyId: user.baseCurrencyId || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user, isEditMode, reset]);

  const onSubmitForm = handleSubmit((data) => {
    const updateData: {
      name?: string;
      baseCurrencyId?: string;
      oldPassword?: string;
      newPassword?: string;
    } = {};

    if (data.name !== user?.name) {
      updateData.name = data.name;
    }
    if (data.baseCurrencyId !== user?.baseCurrencyId) {
      updateData.baseCurrencyId = data.baseCurrencyId;
    }
    if (data.newPassword) {
      updateData.oldPassword = data.oldPassword;
      updateData.newPassword = data.newPassword;
    }

    if (Object.keys(updateData).length === 0) {
      setIsEditMode(false);
      return;
    }

    updateProfileMutation.mutate(updateData, {
      onSuccess: () => {
        setIsEditMode(false);
      },
    });
  });

  const handleEdit = () => {
    if (user) {
      reset({
        name: user.name || '',
        baseCurrencyId: user.baseCurrencyId || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    if (user) {
      reset({
        name: user.name || '',
        baseCurrencyId: user.baseCurrencyId || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Stack align="center" py="xl">
          <Text>{t('profile.loading')}</Text>
        </Stack>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <Stack align="center" py="xl">
          <Text>{t('profile.userNotFound')}</Text>
        </Stack>
      </PageContainer>
    );
  }

  const selectedCurrency = currencies.find((c) => c.id === user.baseCurrencyId);

  return (
    <PageContainer
      buttonGroups={
        !isEditMode ? (
          <Button onClick={handleEdit}>{t('profile.edit')}</Button>
        ) : undefined
      }
    >
      {isEditMode ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmitForm();
          }}
        >
          <Stack gap="md">
            <TextInput
              label={t('profile.username')}
              value={user.username}
              disabled
            />

            <ZodFormController
              control={control}
              name="name"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  label={t('profile.name')}
                  placeholder={t('profile.namePlaceholder')}
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
                  label={t('profile.baseCurrency')}
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

            <Stack
              gap="md"
              pt="md"
              style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
            >
              <Text size="lg" fw={500}>
                {t('profile.changePassword')}
              </Text>

              {newPasswordValue && (
                <ZodFormController
                  control={control}
                  name="oldPassword"
                  render={({ field, fieldState: { error } }) => (
                    <TextInput
                      type="password"
                      label={t('profile.oldPassword')}
                      placeholder={t('profile.oldPasswordPlaceholder')}
                      error={error}
                      {...field}
                    />
                  )}
                />
              )}

              <ZodFormController
                control={control}
                name="newPassword"
                render={({ field, fieldState: { error } }) => (
                  <TextInput
                    type="password"
                    label={t('profile.newPassword')}
                    placeholder={t('profile.newPasswordPlaceholder')}
                    error={error}
                    {...field}
                  />
                )}
              />

              {newPasswordValue && (
                <ZodFormController
                  control={control}
                  name="confirmPassword"
                  render={({ field, fieldState: { error } }) => (
                    <TextInput
                      type="password"
                      label={t('profile.confirmPassword')}
                      placeholder={t('profile.confirmPasswordPlaceholder')}
                      error={error}
                      {...field}
                    />
                  )}
                />
              )}
            </Stack>

            <Group
              justify="flex-end"
              pt="md"
              style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
              >
                {t('profile.cancel')}
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending
                  ? t('profile.saving')
                  : t('profile.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Stack
            gap="xs"
            p="md"
            style={{
              backgroundColor: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Text size="sm" c="dimmed">
              {t('profile.username')}
            </Text>
            <Text size="lg" fw={600}>
              {user.username}
            </Text>
          </Stack>

          <Stack
            gap="xs"
            p="md"
            style={{
              backgroundColor: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Text size="sm" c="dimmed">
              {t('profile.name')}
            </Text>
            <Text size="lg" fw={600}>
              {user.name || t('common.nA')}
            </Text>
          </Stack>

          <Stack
            gap="xs"
            p="md"
            style={{
              backgroundColor: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Text size="sm" c="dimmed">
              {t('profile.role')}
            </Text>
            <Badge color="indigo" variant="light">
              {user.role}
            </Badge>
          </Stack>

          <Stack
            gap="xs"
            p="md"
            style={{
              backgroundColor: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Text size="sm" c="dimmed">
              {t('profile.baseCurrency')}
            </Text>
            <Text size="lg" fw={600}>
              {selectedCurrency
                ? `${selectedCurrency.symbol || ''} - ${selectedCurrency.name} (${selectedCurrency.code})`
                : t('common.nA')}
            </Text>
          </Stack>
        </SimpleGrid>
      )}
    </PageContainer>
  );
};

export default ProfilePage;
