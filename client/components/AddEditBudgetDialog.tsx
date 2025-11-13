import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import {
  Modal,
  MultiSelect,
  NumberInput,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import type { BudgetResponse, IUpsertBudgetDto } from '@server/dto/budget.dto';
import { UpsertBudgetDto } from '@server/dto/budget.dto';
import { BudgetPeriod } from '@server/generated/prisma/enums';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import CategoryMultiSelect from './CategoryMultiSelect';
import { DialogFooterButtons } from './DialogFooterButtons';
import { Select } from './Select';
import { ZodFormController } from './ZodFormController';

const schema = UpsertBudgetDto;

type FormValue = z.infer<typeof UpsertBudgetDto>;

type AddEditBudgetDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  budget: BudgetResponse | null;
  onSubmit: (data: IUpsertBudgetDto, saveAndAdd?: boolean) => void;
  isLoading?: boolean;
  resetTrigger?: number;
};

const AddEditBudgetDialog = ({
  isOpen,
  onClose,
  budget,
  onSubmit,
  isLoading = false,
  resetTrigger,
}: AddEditBudgetDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!budget;
  const { data: accountsData } = useAccountsOptionsQuery();

  const accountOptions = useMemo(() => {
    if (!accountsData?.accounts) return [];
    return accountsData.accounts.map((acc) => ({
      value: acc.id,
      label: `${acc.name} (${acc.currency.code})`,
    }));
  }, [accountsData]);

  const defaultValues: FormValue = {
    name: '',
    amount: 0,
    period: BudgetPeriod.monthly,
    startDate: new Date().toISOString(),
    endDate: undefined,
    carryOver: false,
    accountIds: [],
    categoryIds: [],
  };

  const { control, handleSubmit, reset } = useZodForm({
    zod: schema,
    defaultValues,
  });

  useEffect(() => {
    if (budget) {
      reset({
        id: budget.id,
        name: budget.name,
        amount: parseFloat(budget.amount),
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate || undefined,
        carryOver: budget.carryOver,
        accountIds: budget.accountIds,
        categoryIds: budget.categoryIds,
      });
    } else {
      reset(defaultValues);
    }
  }, [budget, isOpen, reset]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && !budget && isOpen) {
      reset(defaultValues);
    }
  }, [resetTrigger, budget, isOpen, reset]);

  const onSubmitForm = handleSubmit((data) => {
    const submitData: IUpsertBudgetDto = {
      name: data.name.trim(),
      amount: data.amount,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
      carryOver: data.carryOver,
      accountIds: data.accountIds,
      categoryIds: data.categoryIds,
    };

    if (isEditMode && budget) {
      submitData.id = budget.id;
    }

    onSubmit(submitData, false);
  });

  const onSubmitFormAndAdd = handleSubmit((data) => {
    const submitData: IUpsertBudgetDto = {
      name: data.name.trim(),
      amount: data.amount,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
      carryOver: data.carryOver,
      accountIds: data.accountIds,
      categoryIds: data.categoryIds,
    };

    onSubmit(submitData, true);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('budgets.editBudget') : t('budgets.addBudget')}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <ZodFormController
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('budgets.name')}
                placeholder={t('budgets.namePlaceholder')}
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
                label={t('budgets.amount')}
                placeholder={t('budgets.amountPlaceholder')}
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
            name="period"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('budgets.period')}
                placeholder={t('budgets.periodPlaceholder')}
                required
                error={error}
                items={[
                  {
                    value: BudgetPeriod.daily,
                    label: t('budgets.periodOptions.daily', {
                      defaultValue: 'Daily',
                    }),
                  },
                  {
                    value: BudgetPeriod.monthly,
                    label: t('budgets.periodOptions.monthly', {
                      defaultValue: 'Monthly',
                    }),
                  },
                  {
                    value: BudgetPeriod.quarterly,
                    label: t('budgets.periodOptions.quarterly', {
                      defaultValue: 'Quarterly',
                    }),
                  },
                  {
                    value: BudgetPeriod.yearly,
                    label: t('budgets.periodOptions.yearly', {
                      defaultValue: 'Yearly',
                    }),
                  },
                  {
                    value: BudgetPeriod.none,
                    label: t('budgets.periodOptions.none', {
                      defaultValue: 'None',
                    }),
                  },
                ]}
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
                label={t('budgets.startDate')}
                placeholder={t('budgets.startDatePlaceholder')}
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
                label={t('budgets.endDate')}
                placeholder={t('budgets.endDatePlaceholder')}
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
            name="carryOver"
            render={({ field }) => (
              <Switch
                label={t('budgets.carryOver')}
                checked={field.value}
                onChange={(e) => field.onChange(e.currentTarget.checked)}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="accountIds"
            render={({ field, fieldState: { error } }) => (
              <MultiSelect
                label={t('budgets.accounts')}
                placeholder={t('budgets.accountsPlaceholder')}
                required
                data={accountOptions}
                value={field.value || []}
                onChange={(value) => field.onChange(value)}
                error={error}
                searchable
              />
            )}
          />

          <ZodFormController
            control={control}
            name="categoryIds"
            render={({ field, fieldState: { error } }) => (
              <CategoryMultiSelect
                value={field.value || []}
                onChange={(value) => field.onChange(value)}
                filterType="expense"
                placeholder={t('budgets.categoriesPlaceholder')}
                error={error}
              />
            )}
          />

          <DialogFooterButtons
            isEditMode={isEditMode}
            isLoading={isLoading}
            onCancel={onClose}
            onSave={onSubmitForm}
            onSaveAndAdd={onSubmitFormAndAdd}
          />
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditBudgetDialog;
