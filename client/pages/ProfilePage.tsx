import { useUpdateProfileMutation } from '@client/hooks/mutations/useUserMutations';
import { useUserQuery } from '@client/hooks/queries/useUserQuery';
import { CURRENCY_IDS } from '@server/constants/currency';
import type * as React from 'react';
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
  const [formData, setFormData] = useState({
    name: user?.name || '',
    baseCurrencyId: user?.baseCurrencyId || CURRENCY_IDS.VND,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user && !isEditMode) {
      setFormData({
        name: user.name || '',
        baseCurrencyId: user.baseCurrencyId,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user, isEditMode]);

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setFormData({
      name: user.name || '',
      baseCurrencyId: user.baseCurrencyId,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setFormData({
      name: user.name || '',
      baseCurrencyId: user.baseCurrencyId,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      return;
    }

    const updateData: {
      name?: string;
      baseCurrencyId?: string;
      oldPassword?: string;
      newPassword?: string;
    } = {};

    if (formData.name !== user.name) {
      updateData.name = formData.name;
    }
    if (formData.baseCurrencyId !== user.baseCurrencyId) {
      updateData.baseCurrencyId = formData.baseCurrencyId;
    }
    if (formData.newPassword) {
      updateData.oldPassword = formData.oldPassword;
      updateData.newPassword = formData.newPassword;
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
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t('profile.name')}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={t('profile.namePlaceholder')}
                />
              </div>

              <div>
                <label
                  htmlFor="baseCurrencyId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t('profile.baseCurrency')}
                </label>
                <select
                  id="baseCurrencyId"
                  name="baseCurrencyId"
                  value={formData.baseCurrencyId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.symbol} - {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('profile.changePassword')}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="oldPassword"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('profile.oldPassword')}
                    </label>
                    <input
                      id="oldPassword"
                      name="oldPassword"
                      type="password"
                      value={formData.oldPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder={t('profile.oldPasswordPlaceholder')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('profile.newPassword')}
                    </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder={t('profile.newPasswordPlaceholder')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('profile.confirmPassword')}
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder={t('profile.confirmPasswordPlaceholder')}
                    />
                    {formData.newPassword &&
                      formData.newPassword !== formData.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {t('profile.passwordsDoNotMatch')}
                        </p>
                      )}
                  </div>
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
                  disabled={
                    updateProfileMutation.isPending ||
                    !!(
                      formData.newPassword &&
                      formData.newPassword !== formData.confirmPassword
                    )
                  }
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
