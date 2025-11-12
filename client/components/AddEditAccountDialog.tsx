import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import type { AccountFormData, AccountFull } from '@client/types/account';
import { Button, Checkbox, Group, Modal, Stack } from '@mantine/core';
import { AccountType } from '@server/generated/prisma/enums';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { NumberInput } from './NumberInput';
import { Select } from './Select';
import { TextInput } from './TextInput';
import { ZodFormController } from './ZodFormController';

const baseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'accounts.nameRequired'),
  type: z.nativeEnum(AccountType, {
    message: 'accounts.typeRequired',
  }),
  currencyId: z.string().min(1, 'accounts.currencyRequired'),
  initialBalance: z.number().optional(),
  creditLimit: z.number().optional(),
  notifyOnDueDate: z.boolean().optional(),
  paymentDay: z.number().min(1).max(31).optional(),
  notifyDaysBefore: z.number().min(0).optional(),
});

type FormValue = z.infer<typeof baseSchema>;

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

  const defaultValues: FormValue = {
    name: '',
    type: AccountType.cash,
    currencyId: '',
    initialBalance: 0,
    creditLimit: 0,
    notifyOnDueDate: false,
    paymentDay: undefined,
    notifyDaysBefore: undefined,
  };

  const { control, handleSubmit, reset, watch } = useZodForm({
    zod: baseSchema,
    defaultValues,
  });

  const typeValue = watch('type');
  const isCreditCard = typeValue === AccountType.credit_card;

  useEffect(() => {
    if (account) {
      reset({
        id: account.id,
        name: account.name,
        type: account.type,
        currencyId: account.currencyId,
        initialBalance: 0,
        creditLimit: account.creditLimit ? Number(account.creditLimit) : 0,
        notifyOnDueDate: account.notifyOnDueDate ?? false,
        paymentDay: account.paymentDay ?? undefined,
        notifyDaysBefore: account.notifyDaysBefore ?? undefined,
      });
    } else {
      reset(defaultValues);
    }
  }, [account, isOpen, reset]);

  const onSubmitForm = handleSubmit((data) => {
    const submitData: AccountFormData = {
      name: data.name.trim(),
      type: data.type,
      currencyId: data.currencyId,
    };

    if (isEditMode && account) {
      submitData.id = account.id;
    } else {
      if (data.initialBalance !== undefined && data.initialBalance !== null) {
        submitData.initialBalance = data.initialBalance;
      }
    }

    if (isCreditCard) {
      if (data.creditLimit !== undefined && data.creditLimit !== null) {
        submitData.creditLimit = data.creditLimit;
      }
      if (data.notifyOnDueDate !== undefined) {
        submitData.notifyOnDueDate = data.notifyOnDueDate;
      }
      if (data.paymentDay !== undefined && data.paymentDay !== null) {
        submitData.paymentDay = data.paymentDay;
      }
      if (
        data.notifyDaysBefore !== undefined &&
        data.notifyDaysBefore !== null
      ) {
        submitData.notifyDaysBefore = data.notifyDaysBefore;
      }
    }

    onSubmit(submitData);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('accounts.editAccount') : t('accounts.addAccount')}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <ZodFormController
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('accounts.name')}
                placeholder={t('accounts.namePlaceholder')}
                required
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="type"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('accounts.type')}
                placeholder={t('accounts.typePlaceholder')}
                required
                error={error}
                items={[
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
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="currencyId"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('accounts.currency')}
                placeholder={t('accounts.currencyPlaceholder')}
                required
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

          {!isEditMode && (
            <ZodFormController
              control={control}
              name="initialBalance"
              render={({ field, fieldState: { error } }) => (
                <NumberInput
                  label={t('accounts.initialBalance')}
                  placeholder={t('accounts.initialBalancePlaceholder')}
                  error={error}
                  value={field.value ?? 0}
                  onChange={(value) =>
                    field.onChange(
                      value !== '' && value !== null ? Number(value) : 0,
                    )
                  }
                  thousandSeparator=","
                  decimalScale={2}
                  min={0}
                />
              )}
            />
          )}

          {isCreditCard && (
            <>
              <ZodFormController
                control={control}
                name="creditLimit"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('accounts.creditLimit')}
                    placeholder={t('accounts.creditLimitPlaceholder')}
                    error={error}
                    value={field.value ?? 0}
                    onChange={(value) =>
                      field.onChange(
                        value !== '' && value !== null ? Number(value) : 0,
                      )
                    }
                    thousandSeparator=","
                    decimalScale={2}
                    min={0}
                  />
                )}
              />

              <ZodFormController
                control={control}
                name="notifyOnDueDate"
                render={({
                  field: { value, ...field },
                  fieldState: { error },
                }) => (
                  <Checkbox
                    label={t('accounts.notifyOnDueDate')}
                    error={error}
                    checked={value ?? false}
                    onChange={(e) => field.onChange(e.currentTarget.checked)}
                  />
                )}
              />

              <ZodFormController
                control={control}
                name="paymentDay"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('accounts.paymentDay')}
                    placeholder={t('accounts.paymentDayPlaceholder')}
                    error={error}
                    min={1}
                    max={31}
                    value={field.value ?? undefined}
                    onChange={(value) =>
                      field.onChange(
                        value !== '' && value !== null
                          ? Number(value)
                          : undefined,
                      )
                    }
                  />
                )}
              />

              <ZodFormController
                control={control}
                name="notifyDaysBefore"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('accounts.notifyDaysBefore')}
                    placeholder={t('accounts.notifyDaysBeforePlaceholder')}
                    error={error}
                    min={0}
                    value={field.value ?? undefined}
                    onChange={(value) =>
                      field.onChange(
                        value !== '' && value !== null
                          ? Number(value)
                          : undefined,
                      )
                    }
                  />
                )}
              />
            </>
          )}

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
