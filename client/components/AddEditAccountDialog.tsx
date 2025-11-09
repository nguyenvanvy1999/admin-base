import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import type { AccountFormData, AccountFull } from '@client/types/account';
import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { AccountType } from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useValidation } from './utils/validation';

type AddEditAccountDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  account: AccountFull | null;
  onSubmit: (data: AccountFormData) => void;
  isLoading?: boolean;
};

const AddEditAccountDialog = ({
  isOpen,
  onClose,
  account,
  onSubmit,
  isLoading = false,
}: AddEditAccountDialogProps) => {
  const { t } = useTranslation();
  const { data: currencies = [] } = useCurrenciesQuery();
  const isEditMode = !!account;
  const validation = useValidation();

  const form = useForm({
    defaultValues: {
      name: '',
      type: '',
      currencyId: '',
      creditLimit: '',
      notifyOnDueDate: false,
      paymentDay: '',
      notifyDaysBefore: '',
    },
    onSubmit: ({ value }) => {
      if (!value.currencyId || value.currencyId.trim() === '') {
        return;
      }

      const submitData: AccountFormData = {
        name: value.name.trim(),
        type: value.type as AccountType,
        currencyId: value.currencyId,
      };

      if (isEditMode && account) {
        submitData.id = account.id;
      }

      if (value.type === AccountType.credit_card) {
        if (value.creditLimit) {
          submitData.creditLimit = parseFloat(value.creditLimit);
        }
        if (value.notifyOnDueDate !== undefined) {
          submitData.notifyOnDueDate = value.notifyOnDueDate;
        }
        if (value.paymentDay && value.paymentDay !== '') {
          const day = parseInt(value.paymentDay.toString(), 10);
          if (!isNaN(day) && day >= 1 && day <= 31) {
            submitData.paymentDay = day;
          }
        }
        if (value.notifyDaysBefore && value.notifyDaysBefore !== '') {
          const days = parseInt(value.notifyDaysBefore.toString(), 10);
          if (!isNaN(days) && days >= 0) {
            submitData.notifyDaysBefore = days;
          }
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
      form.setFieldValue('notifyOnDueDate', account.notifyOnDueDate ?? false);
      form.setFieldValue('paymentDay', account.paymentDay?.toString() || '');
      form.setFieldValue(
        'notifyDaysBefore',
        account.notifyDaysBefore?.toString() || '',
      );
    } else {
      form.setFieldValue('name', '');
      form.setFieldValue('type', '');
      form.setFieldValue('currencyId', '');
      form.setFieldValue('creditLimit', '');
      form.setFieldValue('notifyOnDueDate', false);
      form.setFieldValue('paymentDay', '');
      form.setFieldValue('notifyDaysBefore', '');
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
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('accounts.name')}
                  placeholder={t('accounts.namePlaceholder')}
                  required
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field
            name="type"
            validators={{
              onChange: validation.required('accounts.typeRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <Select
                  label={t('accounts.type')}
                  placeholder={t('accounts.typePlaceholder')}
                  required
                  data={[
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
                  value={field.state.value ?? null}
                  onChange={(value) => field.handleChange(value ?? '')}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field
            name="currencyId"
            validators={{
              onChange: validation.required('accounts.currencyRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <Select
                  label={t('accounts.currency')}
                  placeholder={t('accounts.currencyPlaceholder')}
                  required
                  data={currencies.map((currency) => ({
                    value: currency.id,
                    label: `${currency.code} - ${currency.name}`,
                  }))}
                  value={field.state.value ?? null}
                  onChange={(value) => field.handleChange(value ?? '')}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Subscribe
            selector={(state) => state.values.type}
            children={(typeValue) => {
              const isCreditCard = typeValue === AccountType.credit_card;
              if (!isCreditCard) return null;
              return (
                <>
                  <form.Field name="creditLimit">
                    {(field) => {
                      const error = field.state.meta.errors[0];
                      return (
                        <TextInput
                          type="number"
                          label={t('accounts.creditLimit')}
                          placeholder={t('accounts.creditLimitPlaceholder')}
                          min="0"
                          step="0.01"
                          value={field.state.value ?? ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          error={error}
                        />
                      );
                    }}
                  </form.Field>

                  <form.Field name="notifyOnDueDate">
                    {(field) => {
                      const error = field.state.meta.errors[0];
                      return (
                        <Checkbox
                          label={t('accounts.notifyOnDueDate')}
                          checked={field.state.value ?? false}
                          onChange={(e) =>
                            field.handleChange(e.currentTarget.checked)
                          }
                          onBlur={field.handleBlur}
                          error={error}
                        />
                      );
                    }}
                  </form.Field>

                  <form.Field name="paymentDay">
                    {(field) => {
                      const error = field.state.meta.errors[0];
                      return (
                        <NumberInput
                          label={t('accounts.paymentDay')}
                          placeholder={t('accounts.paymentDayPlaceholder')}
                          min={1}
                          max={31}
                          value={
                            field.state.value && field.state.value !== ''
                              ? Number(field.state.value)
                              : undefined
                          }
                          onChange={(value) =>
                            field.handleChange(
                              value !== '' && value !== null
                                ? value.toString()
                                : '',
                            )
                          }
                          onBlur={field.handleBlur}
                          error={error}
                        />
                      );
                    }}
                  </form.Field>

                  <form.Field name="notifyDaysBefore">
                    {(field) => {
                      const error = field.state.meta.errors[0];
                      return (
                        <NumberInput
                          label={t('accounts.notifyDaysBefore')}
                          placeholder={t(
                            'accounts.notifyDaysBeforePlaceholder',
                          )}
                          min={0}
                          value={
                            field.state.value && field.state.value !== ''
                              ? Number(field.state.value)
                              : undefined
                          }
                          onChange={(value) =>
                            field.handleChange(
                              value !== '' && value !== null
                                ? value.toString()
                                : '',
                            )
                          }
                          onBlur={field.handleBlur}
                          error={error}
                        />
                      );
                    }}
                  </form.Field>
                </>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => ({
              isValid: state.isValid,
              values: state.values,
            })}
          >
            {({ isValid, values }) => {
              const isFormValid =
                isValid &&
                values.name?.trim() !== '' &&
                values.type !== '' &&
                values.currencyId !== '';

              return (
                <Group justify="flex-end" mt="md">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isLoading || !isFormValid}>
                    {isLoading
                      ? t('common.saving', { defaultValue: 'Saving...' })
                      : isEditMode
                        ? t('common.save')
                        : t('common.add')}
                  </Button>
                </Group>
              );
            }}
          </form.Subscribe>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditAccountDialog;
