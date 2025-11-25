import { PageContainer } from '@client/components/PageContainer';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useChangePasswordMutation,
  useUpdateProfileMutation,
} from '@client/hooks/mutations/useProfileMutations';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useUserQuery } from '@client/hooks/queries/useUserQuery';
import { useZodForm } from '@client/hooks/useZodForm';
import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { ChangePasswordDto, UpdateProfileDto } from '@server/dto/user.dto';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const profileSchema = UpdateProfileDto;

const changePasswordSchema = ChangePasswordDto.extend({
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'profile.passwordsDoNotMatch',
  path: ['confirmPassword'],
});

type ProfileFormValue = z.infer<typeof profileSchema>;
type ChangePasswordFormValue = z.infer<typeof changePasswordSchema>;

const ProfilePage = () => {
  const { t } = useTranslation();
  const { data: user, isLoading } = useUserQuery();
  const { data: currencies = [] } = useCurrenciesQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const [isEditMode, setIsEditMode] = useState(false);

  const profileDefaultValues: ProfileFormValue = {
    name: '',
  };

  const passwordDefaultValues: ChangePasswordFormValue = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
  } = useZodForm({
    zod: profileSchema,
    defaultValues: profileDefaultValues,
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
  } = useZodForm({
    zod: changePasswordSchema,
    defaultValues: passwordDefaultValues,
  });

  useEffect(() => {
    if (user && !isEditMode) {
      resetProfile({
        name: user.name || '',
      });
    }
  }, [user, isEditMode, resetProfile]);

  const onSubmitProfileForm = handleProfileSubmit((data) => {
    const modifieda: {
      name?: string;
    } = {};

    if (data.name !== user?.name) {
      modifieda.name = data.name;
    }

    if (Object.keys(modifieda).length === 0) {
      setIsEditMode(false);
      return;
    }

    updateProfileMutation.mutate(modifieda, {
      onSuccess: () => {
        setIsEditMode(false);
      },
    });
  });

  const onSubmitPasswordForm = handlePasswordSubmit((data) => {
    changePasswordMutation.mutate(
      {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          resetPassword(passwordDefaultValues);
        },
      },
    );
  });

  const handleEdit = () => {
    if (user) {
      resetProfile({
        name: user.name || '',
      });
    }
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    if (user) {
      resetProfile({
        name: user.name || '',
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
      <Stack gap="xl">
        {isEditMode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSubmitProfileForm();
            }}
          >
            <Stack gap="md">
              <Text size="lg" fw={500}>
                {t('profile.title')}
              </Text>

              <TextInput
                label={t('profile.username')}
                value={user.username}
                disabled
              />

              <ZodFormController
                control={profileControl}
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

              <Group justify="flex-end" pt="md">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                >
                  {t('profile.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending
                    ? t('profile.saving')
                    : t('profile.save')}
                </Button>
              </Group>
            </Stack>
          </form>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Paper p="md" bg="gray.0">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t('profile.username')}
                </Text>
                <Text size="lg" fw={600}>
                  {user.username}
                </Text>
              </Stack>
            </Paper>

            <Paper p="md" bg="gray.0">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t('profile.name')}
                </Text>
                <Text size="lg" fw={600}>
                  {user.name || t('common.nA')}
                </Text>
              </Stack>
            </Paper>

            <Paper p="md" bg="gray.0">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t('profile.role')}
                </Text>
                <Group gap="xs" wrap="wrap">
                  {user.roleIds && user.roleIds.length > 0 ? (
                    user.roleIds.map((roleId) => (
                      <Badge key={roleId} color="indigo" variant="light">
                        {roleId}
                      </Badge>
                    ))
                  ) : (
                    <Badge color="indigo" variant="light">
                      {t('users.roleUser')}
                    </Badge>
                  )}
                </Group>
              </Stack>
            </Paper>

            <Paper p="md" bg="gray.0">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t('profile.baseCurrency')}
                </Text>
                <Text size="lg" fw={600}>
                  {selectedCurrency
                    ? `${selectedCurrency.symbol || ''} - ${selectedCurrency.name} (${selectedCurrency.code})`
                    : t('common.nA')}
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSubmitPasswordForm();
          }}
        >
          <Stack gap="md">
            <Text size="lg" fw={500}>
              {t('profile.changePassword')}
            </Text>

            <ZodFormController
              control={passwordControl}
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

            <ZodFormController
              control={passwordControl}
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

            <ZodFormController
              control={passwordControl}
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

            <Group justify="flex-end">
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending
                  ? t('profile.saving')
                  : t('profile.changePassword')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </PageContainer>
  );
};

export default ProfilePage;
