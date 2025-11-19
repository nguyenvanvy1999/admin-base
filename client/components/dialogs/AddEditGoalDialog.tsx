import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { MultiSelect, NumberInput, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import type { GoalResponse, IUpsertGoalDto } from '@server/dto/goal.dto';
import { UpsertGoalDto } from '@server/dto/goal.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { Select } from '../Select';
import { ZodFormController } from '../ZodFormController';
import { CRUDDialog } from './CRUDDialog';

const schema = UpsertGoalDto;

type FormValue = z.infer<typeof UpsertGoalDto>;

type AddEditGoalDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalResponse | null;
  onSubmit: (data: IUpsertGoalDto, saveAndAdd?: boolean) => void;
  isLoading?: boolean;
  resetTrigger?: number;
};

const AddEditGoalDialog = ({
  isOpen,
  onClose,
  goal,
  onSubmit,
  isLoading = false,
}: AddEditGoalDialogProps) => {
  const { t } = useTranslation();
  const { data: accountsData } = useAccountsOptionsQuery();
  const { data: currencies = [] } = useCurrenciesQuery();

  const accountOptions = useMemo(() => {
    if (!accountsData?.accounts) return [];
    return accountsData.accounts.map((acc) => ({
      value: acc.id,
      label: `${acc.name} (${acc.currency.code})`,
    }));
  }, [accountsData]);

  const currencyOptions = useMemo(() => {
    return currencies.map((currency) => ({
      value: currency.id,
      label: `${currency.code} - ${currency.name}`,
    }));
  }, [currencies]);

  const defaultValues: FormValue = {
    name: '',
    amount: 0,
    currencyId: '',
    startDate: new Date().toISOString(),
    endDate: undefined,
    accountIds: [],
  };

  const getFormValues = (goal: GoalResponse): FormValue => ({
    id: goal.id,
    name: goal.name,
    amount: parseFloat(goal.amount),
    currencyId: goal.currencyId,
    startDate: goal.startDate,
    endDate: goal.endDate || undefined,
    accountIds: goal.accountIds,
  });

  const handleSubmit = (data: FormValue, saveAndAdd?: boolean) => {
    const isEditMode = !!goal;

    const submitData: IUpsertGoalDto = {
      name: data.name.trim(),
      amount: data.amount,
      currencyId: data.currencyId,
      startDate: data.startDate,
      endDate: data.endDate,
      accountIds: data.accountIds,
    };

    if (isEditMode && goal) {
      submitData.id = goal.id;
    }

    onSubmit(submitData, saveAndAdd);
  };

  return (
    <CRUDDialog
      isOpen={isOpen}
      onClose={onClose}
      item={goal}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('goals.addGoal'),
        edit: t('goals.editGoal'),
      }}
      schema={schema}
      defaultValues={defaultValues}
      getFormValues={getFormValues}
      size="md"
    >
      {({ control }) => (
        <>
          <ZodFormController
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('goals.name')}
                placeholder={t('goals.namePlaceholder')}
                required
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="amount"
            render={({ field, fieldState: { error } }) => (
              <NumberInput
                label={t('goals.amount')}
                placeholder={t('goals.amountPlaceholder')}
                required
                min={0.01}
                step={0.01}
                decimalScale={2}
                error={error}
                {...field}
                value={field.value || 0}
                onChange={(value) => field.onChange(value || 0)}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="currencyId"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('goals.currency')}
                placeholder={t('goals.currencyPlaceholder')}
                required
                error={error}
                items={currencyOptions}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="startDate"
            render={({ field, fieldState: { error } }) => (
              <DateInput
                label={t('goals.startDate')}
                placeholder={t('goals.startDatePlaceholder')}
                required
                error={error}
                value={field.value ? new Date(field.value as string) : null}
                onChange={(value: Date | string | null) => {
                  if (value instanceof Date) {
                    field.onChange(value.toISOString());
                  } else if (typeof value === 'string') {
                    field.onChange(value);
                  } else {
                    field.onChange('');
                  }
                }}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="endDate"
            render={({ field, fieldState: { error } }) => (
              <DateInput
                label={t('goals.endDate')}
                placeholder={t('goals.endDatePlaceholder')}
                error={error}
                value={field.value ? new Date(field.value as string) : null}
                onChange={(value: Date | string | null) => {
                  if (value instanceof Date) {
                    field.onChange(value.toISOString());
                  } else if (typeof value === 'string') {
                    field.onChange(value);
                  } else {
                    field.onChange(undefined);
                  }
                }}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="accountIds"
            render={({ field, fieldState: { error } }) => (
              <MultiSelect
                label={t('goals.accounts')}
                placeholder={t('goals.accountsPlaceholder')}
                required
                data={accountOptions}
                value={field.value || []}
                onChange={(value) => field.onChange(value)}
                error={error}
                searchable
              />
            )}
          />
        </>
      )}
    </CRUDDialog>
  );
};

export default AddEditGoalDialog;
