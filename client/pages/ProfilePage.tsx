import { useUpdateProfileMutation } from '@client/hooks/mutations/useUserMutations';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useUserQuery } from '@client/hooks/queries/useUserQuery';
import { Button, Select, TextInput } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { data: user, isLoading } = useUserQuery();
  const { data: currencies = [] } = useCurrenciesQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const [isEditMode, setIsEditMode] = useState(false);

  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      baseCurrencyId: user?.baseCurrencyId || '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    onSubmit: ({ value }) => {
      const updateData: {
        name?: string;
        baseCurrencyId?: string;
        oldPassword?: string;
        newPassword?: string;
      } = {};

      if (value.name !== user?.name) {
        updateData.name = value.name;
      }
      if (value.baseCurrencyId !== user?.baseCurrencyId) {
        updateData.baseCurrencyId = value.baseCurrencyId;
      }
      if (value.newPassword) {
        updateData.oldPassword = value.oldPassword;
        updateData.newPassword = value.newPassword;
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
    },
  });

  useEffect(() => {
    if (user && !isEditMode) {
      form.setFieldValue('name', user.name || '');
      form.setFieldValue('baseCurrencyId', user.baseCurrencyId);
      form.setFieldValue('oldPassword', '');
      form.setFieldValue('newPassword', '');
      form.setFieldValue('confirmPassword', '');
    }
  }, [user, isEditMode, form]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('profile.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">
          {t('profile.userNotFound')}
        </p>
      </div>
    );
  }

  const handleEdit = () => {
    if (user) {
      form.setFieldValue('name', user.name || '');
      form.setFieldValue('baseCurrencyId', user.baseCurrencyId);
      form.setFieldValue('oldPassword', '');
      form.setFieldValue('newPassword', '');
      form.setFieldValue('confirmPassword', '');
    }
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    if (user) {
      form.setFieldValue('name', user.name || '');
      form.setFieldValue('baseCurrencyId', user.baseCurrencyId);
      form.setFieldValue('oldPassword', '');
      form.setFieldValue('newPassword', '');
      form.setFieldValue('confirmPassword', '');
    }
  };

  const selectedCurrency = currencies.find((c) => c.id === user.baseCurrencyId);

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('profile.title')}
            </h1>
            {!isEditMode && (
              <Button onClick={handleEdit}>{t('profile.edit')}</Button>
            )}
          </div>

          {isEditMode ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-6"
            >
              <TextInput
                label={t('profile.username')}
                value={user.username}
                disabled
              />

              <form.Field name="name">
                {(field) => {
                  const error = field.state.meta.errors[0];
                  return (
                    <TextInput
                      label={t('profile.name')}
                      placeholder={t('profile.namePlaceholder')}
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      error={error}
                    />
                  );
                }}
              </form.Field>

              <form.Field name="baseCurrencyId">
                {(field) => {
                  const error = field.state.meta.errors[0];
                  return (
                    <Select
                      label={t('profile.baseCurrency')}
                      data={currencies.map((currency) => ({
                        value: currency.id,
                        label: `${currency.symbol || ''} - ${currency.name} (${currency.code})`,
                      }))}
                      value={field.state.value ?? null}
                      onChange={(value) => field.handleChange(value ?? '')}
                      onBlur={field.handleBlur}
                      error={error}
                    />
                  );
                }}
              </form.Field>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('profile.changePassword')}
                </h3>

                <div className="space-y-4">
                  <form.Field name="oldPassword">
                    {(field) => {
                      const error = field.state.meta.errors[0];
                      return (
                        <TextInput
                          type="password"
                          label={t('profile.oldPassword')}
                          placeholder={t('profile.oldPasswordPlaceholder')}
                          value={field.state.value ?? ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          error={error}
                        />
                      );
                    }}
                  </form.Field>

                  <form.Field
                    name="newPassword"
                    validators={{
                      onChange: ({ value }) => {
                        if (
                          !value ||
                          (typeof value === 'string' && !value.trim())
                        ) {
                          return undefined;
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
                          label={t('profile.newPassword')}
                          placeholder={t('profile.newPasswordPlaceholder')}
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
                        const newPassword =
                          fieldApi.form.getFieldValue('newPassword');
                        if (!newPassword) {
                          return undefined;
                        }
                        if (
                          !value ||
                          (typeof value === 'string' && !value.trim())
                        ) {
                          return t('register.confirmPasswordRequired');
                        }
                        if (
                          typeof value === 'string' &&
                          value !== newPassword
                        ) {
                          return t('profile.passwordsDoNotMatch');
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
                          label={t('profile.confirmPassword')}
                          placeholder={t('profile.confirmPasswordPlaceholder')}
                          value={field.state.value ?? ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          error={error}
                        />
                      );
                    }}
                  </form.Field>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
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
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('profile.username')}
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {user.username}
                  </dd>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('profile.name')}
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {user.name || t('common.nA')}
                  </dd>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('profile.role')}
                  </dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      {user.role}
                    </span>
                  </dd>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('profile.baseCurrency')}
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedCurrency
                      ? `${selectedCurrency.symbol || ''} - ${selectedCurrency.name} (${selectedCurrency.code})`
                      : t('common.nA')}
                  </dd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
