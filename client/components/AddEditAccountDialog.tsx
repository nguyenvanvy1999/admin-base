import { CURRENCY_IDS } from '@server/constants/currency';
import { AccountType } from '@server/generated/prisma/enums';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from './ui/DatePicker';
import Input from './ui/Input';
import Select from './ui/Select';

type Account = {
  id: string;
  type: string;
  name: string;
  currencyId: string;
  creditLimit: string | null;
  expiryDate: string | null;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
  };
};

type AddEditAccountDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onSubmit: (data: {
    id?: string;
    type: string;
    name: string;
    currencyId: string;
    creditLimit?: number;
    expiryDate?: string;
  }) => void;
  isLoading?: boolean;
};

const CURRENCIES = [
  { id: CURRENCY_IDS.VND, code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { id: CURRENCY_IDS.USD, code: 'USD', name: 'US Dollar', symbol: '$' },
];

const AddEditAccountDialog = ({
  isOpen,
  onClose,
  account,
  onSubmit,
  isLoading = false,
}: AddEditAccountDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!account;

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    currencyId: '',
    creditLimit: '',
    expiryDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        currencyId: account.currencyId,
        creditLimit: account.creditLimit || '',
        expiryDate: account.expiryDate
          ? new Date(account.expiryDate).toISOString().split('T')[0]
          : '',
      });
    } else {
      setFormData({
        name: '',
        type: '',
        currencyId: '',
        creditLimit: '',
        expiryDate: '',
      });
    }
    setErrors({});
  }, [account, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('accounts.nameRequired');
    }
    if (!formData.type) {
      newErrors.type = t('accounts.typeRequired');
    }
    if (!formData.currencyId) {
      newErrors.currencyId = t('accounts.currencyRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData: {
      id?: string;
      type: string;
      name: string;
      currencyId: string;
      creditLimit?: number;
      expiryDate?: string;
    } = {
      name: formData.name.trim(),
      type: formData.type,
      currencyId: formData.currencyId,
    };

    if (isEditMode && account) {
      submitData.id = account.id;
    }

    if (formData.type === AccountType.credit_card) {
      if (formData.creditLimit) {
        submitData.creditLimit = parseFloat(formData.creditLimit);
      }
      if (formData.expiryDate) {
        submitData.expiryDate = new Date(formData.expiryDate).toISOString();
      }
    }

    onSubmit(submitData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isCreditCard = formData.type === AccountType.credit_card;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-40 dark:bg-opacity-60 transition-opacity backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        ></div>

        <div className="relative z-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isEditMode
                ? t('accounts.editAccount')
                : t('accounts.addAccount')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              name="name"
              label={t('accounts.name')}
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t('accounts.namePlaceholder')}
              error={errors.name}
              required
            />

            <Select
              name="type"
              label={t('accounts.type')}
              value={formData.type}
              onChange={handleInputChange}
              placeholder={t('accounts.typePlaceholder')}
              error={errors.type}
              required
              options={[
                { value: AccountType.cash, label: t('accounts.cash') },
                { value: AccountType.bank, label: t('accounts.bank') },
                {
                  value: AccountType.credit_card,
                  label: t('accounts.credit_card'),
                },
                {
                  value: AccountType.investment,
                  label: t('accounts.investment'),
                },
              ]}
            />

            <Select
              name="currencyId"
              label={t('accounts.currency')}
              value={formData.currencyId}
              onChange={handleInputChange}
              placeholder={t('accounts.currencyPlaceholder')}
              error={errors.currencyId}
              required
              options={CURRENCIES.map((currency) => ({
                value: currency.id,
                label: `${currency.code} - ${currency.name}`,
              }))}
            />

            {isCreditCard && (
              <>
                <Input
                  type="number"
                  name="creditLimit"
                  label={t('accounts.creditLimit')}
                  value={formData.creditLimit}
                  onChange={handleInputChange}
                  placeholder={t('accounts.creditLimitPlaceholder')}
                  min="0"
                  step="0.01"
                />

                <DatePicker
                  name="expiryDate"
                  label={t('accounts.expiryDate')}
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading
                  ? t('common.saving', { defaultValue: 'Saving...' })
                  : isEditMode
                    ? t('common.save')
                    : t('common.add')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditAccountDialog;
