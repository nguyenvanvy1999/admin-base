import { Button, Group, Modal, Stack } from '@mantine/core';
import { CURRENCY_IDS } from '@server/constants/currency';
import { AccountType } from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDatePicker } from './ui/FormDatePicker';
import { FormSelect } from './ui/FormSelect';
import { FormTextInput } from './ui/FormTextInput';
import { useValidation } from './validation';

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

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('accounts.editAccount') : t('accounts.addAccount')}
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <form.Field
            name="name"
            validators={{
              onChange: validation.required('accounts.nameRequired'),
            }}
          >
            {(field) => (
              <FormTextInput
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
                      <FormTextInput
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

          <Group justify="flex-end" mt="md">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common.saving', { defaultValue: 'Saving...' })
                : isEditMode
                  ? t('common.save')
                  : t('common.add')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditAccountDialog;
