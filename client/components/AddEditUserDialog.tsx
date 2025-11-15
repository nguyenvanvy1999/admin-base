import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { Modal, PasswordInput, Stack, TextInput } from '@mantine/core';
import type { IUpsertUserDto, UserResponse } from '@server/dto/admin/user.dto';
import { UpsertUserDto } from '@server/dto/admin/user.dto';
import { UserRole } from '@server/generated';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DialogFooterButtons } from './DialogFooterButtons';
import { Select } from './Select';
import { ZodFormController } from './ZodFormController';

const createSchema = UpsertUserDto.extend({
  username: z.string().min(1, 'users.usernameRequired'),
  password: z.string().min(6, 'users.passwordMinLength'),
  role: z.enum([UserRole.user, UserRole.admin], {
    message: 'users.roleRequired',
  }),
});

const updateSchema = UpsertUserDto.extend({
  username: z.string().min(1, 'users.usernameRequired'),
  password: z
    .string()
    .min(6, 'users.passwordMinLength')
    .optional()
    .or(z.literal('')),
  role: z.enum([UserRole.user, UserRole.admin], {
    message: 'users.roleRequired',
  }),
});

type FormValue = z.infer<typeof createSchema> | z.infer<typeof updateSchema>;

type AddEditUserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  user: UserResponse | null;
  onSubmit: (data: IUpsertUserDto) => void;
  isLoading?: boolean;
};

const AddEditUserDialog = ({
  isOpen,
  onClose,
  user,
  onSubmit,
  isLoading = false,
}: AddEditUserDialogProps) => {
  const { t } = useTranslation();
  const { data: currencies = [] } = useCurrenciesQuery();
  const isEditMode = !!user;

  const defaultValues = {
    username: '',
    password: isEditMode ? undefined : '',
    name: undefined,
    role: UserRole.user,
    baseCurrencyId: undefined,
  } as FormValue;

  const { control, handleSubmit, reset } = useZodForm({
    zod: isEditMode ? updateSchema : createSchema,
    defaultValues,
  });

  useEffect(() => {
    if (user) {
      reset({
        id: user.id,
        username: user.username,
        password: undefined,
        name: user.name ?? undefined,
        role: user.role,
        baseCurrencyId: user.baseCurrencyId ?? undefined,
      });
    } else {
      reset(defaultValues);
    }
  }, [user, isOpen, reset]);

  const onSubmitForm = handleSubmit((data) => {
    const submitData: IUpsertUserDto = {
      username: data.username.trim(),
      role: data.role,
    };

    if (isEditMode && user) {
      submitData.id = user.id;
    } else {
      if (data.password) {
        submitData.password = data.password;
      }
    }

    if (data.name !== undefined && data.name !== null && data.name.trim()) {
      submitData.name = data.name.trim();
    }

    if (data.baseCurrencyId) {
      submitData.baseCurrencyId = data.baseCurrencyId;
    }

    if (isEditMode && data.password && data.password.trim().length > 0) {
      submitData.password = data.password.trim();
    }

    onSubmit(submitData);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('users.editUser') : t('users.addUser')}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <ZodFormController
            control={control}
            name="username"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('users.username')}
                placeholder={t('users.usernamePlaceholder')}
                required
                error={error}
                {...field}
              />
            )}
          />

          {!isEditMode && (
            <ZodFormController
              control={control}
              name="password"
              render={({ field, fieldState: { error } }) => (
                <PasswordInput
                  label={t('users.password')}
                  placeholder={t('users.passwordPlaceholder')}
                  required
                  error={error}
                  {...field}
                />
              )}
            />
          )}

          {isEditMode && (
            <ZodFormController
              control={control}
              name="password"
              render={({ field, fieldState: { error } }) => (
                <PasswordInput
                  label={t('users.password')}
                  placeholder={t('users.passwordPlaceholderOptional')}
                  description={t('users.passwordChangeDescription')}
                  error={error}
                  {...field}
                />
              )}
            />
          )}

          <ZodFormController
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('users.name')}
                placeholder={t('users.namePlaceholder')}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="role"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('users.role')}
                placeholder={t('users.rolePlaceholder')}
                required
                error={error}
                items={[
                  { value: UserRole.user, label: t('users.roleUser') },
                  { value: UserRole.admin, label: t('users.roleAdmin') },
                ]}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="baseCurrencyId"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('users.baseCurrency')}
                placeholder={t('users.baseCurrencyPlaceholder')}
                error={error}
                items={currencies.map((currency) => ({
                  value: currency.id,
                  label: `${currency.code} - ${currency.name}`,
                }))}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />

          <DialogFooterButtons
            isEditMode={isEditMode}
            isLoading={isLoading}
            onCancel={onClose}
            onSave={onSubmitForm}
            showSaveAndAdd={false}
          />
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditUserDialog;
