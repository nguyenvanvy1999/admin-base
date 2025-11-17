import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { PasswordInput, TextInput } from '@mantine/core';
import type { IUpsertUserDto, UserResponse } from '@server/dto/admin/user.dto';
import { UpsertUserDto } from '@server/dto/admin/user.dto';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CRUDDialog } from './dialogs/CRUDDialog';
import { Select } from './Select';
import { ZodFormController } from './ZodFormController';

const createSchema = UpsertUserDto.extend({
  username: z.string().min(1, 'users.usernameRequired'),
  password: z.string().min(6, 'users.passwordMinLength'),
});

const updateSchema = UpsertUserDto.extend({
  username: z.string().min(1, 'users.usernameRequired'),
  password: z
    .string()
    .min(6, 'users.passwordMinLength')
    .optional()
    .or(z.literal('')),
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
    password: '',
    name: undefined,
    baseCurrencyId: undefined,
  } as FormValue;

  const getFormValues = (user: UserResponse): FormValue => ({
    id: user.id,
    username: user.username,
    password: undefined,
    name: user.name ?? undefined,
    baseCurrencyId: user.baseCurrencyId ?? undefined,
  });

  const handleSubmit = (data: FormValue) => {
    const submitData: IUpsertUserDto = {
      username: data.username.trim(),
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
  };

  return (
    <CRUDDialog
      isOpen={isOpen}
      onClose={onClose}
      item={user}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('users.addUser'),
        edit: t('users.editUser'),
      }}
      schema={isEditMode ? updateSchema : createSchema}
      defaultValues={defaultValues}
      getFormValues={getFormValues}
      showSaveAndAdd={false}
      size="md"
    >
      {({ control, isEditMode }) => (
        <>
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
        </>
      )}
    </CRUDDialog>
  );
};

export default AddEditUserDialog;
