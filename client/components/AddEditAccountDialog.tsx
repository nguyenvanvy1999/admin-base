import { CURRENCY_IDS } from '@server/constants/currency';
import { AccountType } from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useValidation } from '../libs/validation';
import { FormDatePicker } from './ui/FormDatePicker';
import { FormInput } from './ui/FormInput';
import { FormSelect } from './ui/FormSelect';

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
  const validation = useValidation();

  const form = useForm({
    defaultValues: {
      name: '',
      type: '',
      currencyId: '',
      creditLimit: '',
      expiryDate: '',
    },
    onSubmit: ({ value }) => {
      const submitData: {
        id?: string;
        type: string;
        name: string;
        currencyId: string;
        creditLimit?: number;
        expiryDate?: string;
      } = {
        name: value.name.trim(),
        type: value.type,
        currencyId: value.currencyId,
      };

      if (isEditMode && account) {
        submitData.id = account.id;
      }

      if (value.type === AccountType.credit_card) {
        if (value.creditLimit) {
          submitData.creditLimit = parseFloat(value.creditLimit);
        }
        if (value.expiryDate) {
          submitData.expiryDate = new Date(value.expiryDate).toISOString();
        }
      }

      onSubmit(submitData);
    },
  });

  useEffect(() => {
    if (account) {
      form.setFieldValue('name', account.name);
      form.setFieldValue('type', account.type);
      form.setFieldValue('currencyId', account.currencyId);
      form.setFieldValue('creditLimit', account.creditLimit || '');
      form.setFieldValue(
        'expiryDate',
        account.expiryDate
          ? new Date(account.expiryDate).toISOString().split('T')[0]
          : '',
      );
    } else {
      form.setFieldValue('name', '');
      form.setFieldValue('type', '');
      form.setFieldValue('currencyId', '');
      form.setFieldValue('creditLimit', '');
      form.setFieldValue('expiryDate', '');
    }
  }, [account, isOpen, form]);

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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field
              name="name"
              validators={{
                onChange: validation.required('accounts.nameRequired'),
              }}
            >
              {(field) => (
                <FormInput
                  field={field}
                  label={t('accounts.name')}
                  placeholder={t('accounts.namePlaceholder')}
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="type"
              validators={{
                onChange: validation.required('accounts.typeRequired'),
              }}
            >
              {(field) => (
                <FormSelect
                  field={field}
                  label={t('accounts.type')}
                  placeholder={t('accounts.typePlaceholder')}
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
              )}
            </form.Field>

            <form.Field
              name="currencyId"
              validators={{
                onChange: validation.required('accounts.currencyRequired'),
              }}
            >
              {(field) => (
                <FormSelect
                  field={field}
                  label={t('accounts.currency')}
                  placeholder={t('accounts.currencyPlaceholder')}
                  required
                  options={CURRENCIES.map((currency) => ({
                    value: currency.id,
                    label: `${currency.code} - ${currency.name}`,
                  }))}
                />
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => state.values.type}
              children={(typeValue) => {
                const isCreditCard = typeValue === AccountType.credit_card;
                if (!isCreditCard) return null;
                return (
                  <>
                    <form.Field name="creditLimit">
                      {(field) => (
                        <FormInput
                          field={field}
                          type="number"
                          label={t('accounts.creditLimit')}
                          placeholder={t('accounts.creditLimitPlaceholder')}
                          min="0"
                          step="0.01"
                        />
                      )}
                    </form.Field>

                    <form.Field name="expiryDate">
                      {(field) => (
                        <FormDatePicker
                          field={field}
                          label={t('accounts.expiryDate')}
                        />
                      )}
                    </form.Field>
                  </>
                );
              }}
            />

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
