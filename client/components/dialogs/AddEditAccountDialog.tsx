import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { Checkbox, NumberInput, TextInput } from '@mantine/core';
import {
  type AccountResponse,
  type IUpsertAccountDto,
  UpsertAccountDto,
} from '@server/dto/account.dto';
import { AccountType } from '@server/generated';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CRUDDialog } from './dialogs/CRUDDialog';
import { Select } from './Select';
import { ZodFormController } from './ZodFormController';

const baseSchema = UpsertAccountDto.extend({
  name: z.string().min(1, 'accounts.nameRequired'),
  type: z.enum(AccountType, {
    message: 'accounts.typeRequired',
  }),
  currencyId: z.string().min(1, 'accounts.currencyRequired'),
});

type FormValue = z.infer<typeof baseSchema>;

type AddEditAccountDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  account: AccountResponse | null;
  onSubmit: (data: IUpsertAccountDto) => void;
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

  const getFormValues = (account: AccountResponse): FormValue => ({
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

  const handleSubmit = (data: FormValue) => {
    const isEditMode = !!account;
    const isCreditCard = data.type === AccountType.credit_card;

    const submitData: IUpsertAccountDto = {
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
  };

  return (
    <CRUDDialog
      isOpen={isOpen}
      onClose={onClose}
      item={account}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('accounts.addAccount'),
        edit: t('accounts.editAccount'),
      }}
      schema={baseSchema}
      defaultValues={defaultValues}
      getFormValues={getFormValues}
      showSaveAndAdd={false}
      size="md"
    >
      {({ control, watch, isEditMode }) => {
        const typeValue = watch('type');
        const isCreditCard = typeValue === AccountType.credit_card;

        return (
          <>
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
          </>
        );
      }}
    </CRUDDialog>
  );
};

export default AddEditAccountDialog;
