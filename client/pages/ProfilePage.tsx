import { FormInput } from '@client/components/ui/FormInput';
import { FormSelect } from '@client/components/ui/FormSelect';
import { useUpdateProfileMutation } from '@client/hooks/mutations/useUserMutations';
import { useUserQuery } from '@client/hooks/queries/useUserQuery';
import { CURRENCY_IDS } from '@server/constants/currency';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const CURRENCIES = [
  { id: CURRENCY_IDS.VND, code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { id: CURRENCY_IDS.USD, code: 'USD', name: 'US Dollar', symbol: '$' },
];

const ProfilePage = () => {
  const { t } = useTranslation();
  const { data: user, isLoading } = useUserQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const [isEditMode, setIsEditMode] = useState(false);

  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      baseCurrencyId: user?.baseCurrencyId || CURRENCY_IDS.VND,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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

  const selectedCurrency = CURRENCIES.find((c) => c.id === user.baseCurrencyId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('profile.title')}
            </h1>
            {!isEditMode && (
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {t('profile.edit')}
              </button>
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
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t('profile.username')}
                </label>
                <input
                  id="username"
                  type="text"
                  value={user.username}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <form.Field name="name">
                {(field) => (
                  <FormInput
                    field={field}
                    label={t('profile.name')}
                    placeholder={t('profile.namePlaceholder')}
                  />
                )}
              </form.Field>

              <form.Field name="baseCurrencyId">
                {(field) => (
                  <FormSelect
                    field={field}
                    label={t('profile.baseCurrency')}
                    options={CURRENCIES.map((currency) => ({
                      value: currency.id,
                      label: `${currency.symbol} - ${currency.name} (${currency.code})`,
                    }))}
                  />
                )}
              </form.Field>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('profile.changePassword')}
                </h3>

                <div className="space-y-4">
                  <form.Field name="oldPassword">
                    {(field) => (
                      <FormInput
                        field={field}
                        type="password"
                        label={t('profile.oldPassword')}
                        placeholder={t('profile.oldPasswordPlaceholder')}
                      />
                    )}
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
                    {(field) => (
                      <FormInput
                        field={field}
                        type="password"
                        label={t('profile.newPassword')}
                        placeholder={t('profile.newPasswordPlaceholder')}
                      />
                    )}
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
                    {(field) => (
                      <FormInput
                        field={field}
                        type="password"
                        label={t('profile.confirmPassword')}
                        placeholder={t('profile.confirmPasswordPlaceholder')}
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('profile.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isPending
                    ? t('profile.saving')
                    : t('profile.save')}
                </button>
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
                      ? `${selectedCurrency.symbol} - ${selectedCurrency.name} (${selectedCurrency.code})`
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
