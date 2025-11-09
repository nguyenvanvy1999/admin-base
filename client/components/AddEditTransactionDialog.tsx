import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { useEntitiesQuery } from '@client/hooks/queries/useEntityQueries';
import type {
  TransactionFormData,
  TransactionFull,
} from '@client/types/transaction';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Tabs,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { TransactionType } from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CategorySelect from './CategorySelect';
import { flattenCategories, getCategoryIcon } from './utils/category';
import { useValidation } from './utils/validation';

type AddEditTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionFull | null;
  onSubmit: (data: TransactionFormData, saveAndAdd: boolean) => void;
  isLoading?: boolean;
};

const AddEditTransactionDialog = ({
  isOpen,
  onClose,
  transaction,
  onSubmit,
  isLoading = false,
}: AddEditTransactionDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!transaction;
  const validation = useValidation();
  const [activeTab, setActiveTab] = useState<string>(
    transaction?.type === TransactionType.income
      ? TransactionType.income
      : TransactionType.expense,
  );
  const [saveAndAdd, setSaveAndAdd] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);

  const { data: accountsData } = useAccountsQuery({});
  const { data: categoriesData } = useCategoriesQuery({});
  const { data: entitiesData } = useEntitiesQuery({});

  const accounts = accountsData?.accounts || [];
  const entities = entitiesData?.entities || [];

  const transactionType = useMemo(() => {
    return activeTab === TransactionType.income
      ? TransactionType.income
      : TransactionType.expense;
  }, [activeTab]);

  const flattenedCategories = useMemo(() => {
    if (!categoriesData?.categories) {
      return [];
    }
    return flattenCategories(categoriesData.categories, t, transactionType);
  }, [categoriesData, transactionType, t]);

  const entityOptions = useMemo(() => {
    return entities.map((entity) => ({
      value: entity.id,
      label: entity.name,
    }));
  }, [entities]);

  const accountOptions = useMemo(() => {
    return accounts.map((account) => ({
      value: account.id,
      label: `${account.name} (${account.currency.code})`,
    }));
  }, [accounts]);

  const quickCategoryButtons = useMemo(() => {
    if (!categoriesData?.categories) {
      return [];
    }

    const findCategoryById = (
      categories: typeof categoriesData.categories,
      id: string,
    ): (typeof categoriesData.categories)[0] | null => {
      for (const cat of categories) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategoryById(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    return flattenedCategories
      .filter((opt) => {
        const cat = findCategoryById(categoriesData.categories, opt.value);
        return cat && cat.type === transactionType;
      })
      .slice(0, 7)
      .map((opt) => {
        const cat = findCategoryById(categoriesData.categories, opt.value);
        return {
          id: opt.value,
          name: opt.label.trim(),
          icon: opt.icon || cat?.name,
          color: opt.color,
        };
      });
  }, [flattenedCategories, categoriesData, transactionType, t]);

  const form = useForm({
    defaultValues: {
      amount: 0,
      accountId: '',
      date: new Date().toISOString(),
      categoryId: '',
      entityId: null as string | null,
      tripEvent: '',
      note: '',
      fee: 0,
      borrowToPay: false,
    },
    onSubmit: ({ value }) => {
      if (!value.accountId || !value.categoryId || !value.date) {
        return;
      }

      const transactionType =
        activeTab === TransactionType.income
          ? TransactionType.income
          : TransactionType.expense;

      const submitData: TransactionFormData = {
        type: transactionType,
        accountId: value.accountId,
        categoryId: value.categoryId,
        amount: Number(value.amount),
        date: value.date,
      };

      if (isEditMode && transaction) {
        submitData.id = transaction.id;
      }

      if (value.entityId) {
        submitData.entityId = value.entityId;
      }

      if (value.note && value.note.trim()) {
        submitData.note = value.note.trim();
      }

      if (value.fee && value.fee > 0) {
        submitData.fee = Number(value.fee);
      }

      if (value.tripEvent || value.borrowToPay) {
        submitData.metadata = {
          ...(transaction?.metadata || {}),
          tripEvent: value.tripEvent || undefined,
          borrowToPay: value.borrowToPay || undefined,
        };
      }

      onSubmit(submitData, saveAndAdd);
      if (!saveAndAdd) {
        handleClose();
      } else {
        form.reset();
        setActiveTab(
          activeTab === TransactionType.income
            ? TransactionType.expense
            : TransactionType.income,
        );
      }
    },
  });

  const handleClose = () => {
    form.reset();
    setSaveAndAdd(false);
    setActiveTab(
      transaction?.type === TransactionType.income
        ? TransactionType.income
        : TransactionType.expense,
    );
    onClose();
  };

  useEffect(() => {
    if (transaction) {
      form.setFieldValue('amount', parseFloat(transaction.amount));
      form.setFieldValue('accountId', transaction.accountId);
      form.setFieldValue(
        'date',
        transaction.date
          ? new Date(transaction.date).toISOString()
          : new Date().toISOString(),
      );
      form.setFieldValue('categoryId', transaction.categoryId || '');
      form.setFieldValue('entityId', transaction.entityId || null);
      form.setFieldValue('note', transaction.note || '');
      const feeValue = transaction.fee ? parseFloat(transaction.fee) : 0;
      form.setFieldValue('fee', feeValue);
      setFeeEnabled(feeValue > 0);
      form.setFieldValue(
        'tripEvent',
        (transaction.metadata as any)?.tripEvent || '',
      );
      form.setFieldValue(
        'borrowToPay',
        (transaction.metadata as any)?.borrowToPay || false,
      );
      setActiveTab(transaction.type);
    } else {
      form.setFieldValue('amount', 0);
      form.setFieldValue('accountId', '');
      form.setFieldValue('date', new Date().toISOString());
      form.setFieldValue('categoryId', '');
      form.setFieldValue('entityId', null);
      form.setFieldValue('tripEvent', '');
      form.setFieldValue('note', '');
      form.setFieldValue('fee', 0);
      setFeeEnabled(false);
      form.setFieldValue('borrowToPay', false);
    }
  }, [transaction, isOpen, form]);

  const selectedAccount = useMemo(() => {
    if (!form.state.values.accountId) return null;
    return accounts.find((acc) => acc.id === form.state.values.accountId);
  }, [form.state.values.accountId, accounts]);

  const currencySymbol = selectedAccount?.currency.symbol || '';

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={
        isEditMode
          ? t('transactions.editTransaction')
          : t('transactions.addTransaction')
      }
      size="xl"
      centered
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <Tabs
            value={activeTab}
            onChange={(value) => value && setActiveTab(value)}
          >
            <Tabs.List>
              <Tabs.Tab value={TransactionType.expense}>
                {t('transactions.expense')}
              </Tabs.Tab>
              <Tabs.Tab value={TransactionType.income}>
                {t('transactions.income')}
              </Tabs.Tab>
              <Tabs.Tab value={TransactionType.transfer} disabled>
                {t('transactions.transfer')}
              </Tabs.Tab>
              <Tabs.Tab value="adjust_balance" disabled>
                {t('transactions.adjustBalance')}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <form.Field
                name="amount"
                validators={{
                  onChange: (value) => {
                    if (!value || Number(value) <= 0) {
                      return t('transactions.amountRequired');
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => {
                  const error = field.state.meta.errors[0];
                  return (
                    <NumberInput
                      label={t('transactions.amount')}
                      placeholder={`0 ${currencySymbol}`}
                      required
                      value={field.state.value ?? 0}
                      onChange={(value) =>
                        field.handleChange(Number(value) || 0)
                      }
                      onBlur={field.handleBlur}
                      error={error}
                      thousandSeparator=","
                      decimalScale={2}
                      min={0}
                      prefix={currencySymbol ? `${currencySymbol} ` : ''}
                    />
                  );
                }}
              </form.Field>

              <form.Field
                name="accountId"
                validators={{
                  onChange: validation.required('transactions.accountRequired'),
                }}
              >
                {(field) => {
                  const error = field.state.meta.errors[0];
                  return (
                    <Select
                      label={t('transactions.account')}
                      placeholder={t('transactions.selectAccount')}
                      required
                      data={accountOptions}
                      value={field.state.value ?? null}
                      onChange={(value) => field.handleChange(value || '')}
                      onBlur={field.handleBlur}
                      error={error}
                      searchable
                    />
                  );
                }}
              </form.Field>

              <form.Field
                name="date"
                validators={{
                  onChange: validation.required('transactions.dateRequired'),
                }}
              >
                {(field) => {
                  const error = field.state.meta.errors[0];
                  const dateValue = field.state.value
                    ? new Date(field.state.value)
                    : new Date();
                  return (
                    <DateTimePicker
                      label={t('transactions.date')}
                      placeholder={t('transactions.selectDate')}
                      required
                      value={dateValue}
                      onChange={(value) => {
                        if (
                          value &&
                          typeof value === 'object' &&
                          'toISOString' in value
                        ) {
                          field.handleChange((value as Date).toISOString());
                        } else if (value) {
                          field.handleChange(
                            new Date(value as string | number).toISOString(),
                          );
                        } else {
                          field.handleChange(new Date().toISOString());
                        }
                      }}
                      onBlur={field.handleBlur}
                      error={error}
                      valueFormat="DD/MM/YYYY HH:mm"
                    />
                  );
                }}
              </form.Field>

              <form.Field name="tripEvent">
                {(field) => {
                  return (
                    <TextInput
                      label={t('transactions.tripEvent')}
                      placeholder={t('transactions.tripEventPlaceholder')}
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  );
                }}
              </form.Field>

              <form.Field name="entityId">
                {(field) => {
                  return (
                    <Select
                      label={t('transactions.spendFor')}
                      placeholder={t('transactions.spendForPlaceholder')}
                      data={entityOptions}
                      value={field.state.value ?? null}
                      onChange={(value) => field.handleChange(value || null)}
                      onBlur={field.handleBlur}
                      searchable
                      clearable
                    />
                  );
                }}
              </form.Field>
            </div>

            <div className="space-y-4">
              <form.Field
                name="categoryId"
                validators={{
                  onChange: validation.required(
                    'transactions.categoryRequired',
                  ),
                }}
              >
                {(field) => {
                  const error = field.state.meta.errors[0];
                  return (
                    <div>
                      <CategorySelect
                        label={t('transactions.category')}
                        placeholder={t('transactions.selectCategory')}
                        required
                        value={field.state.value || null}
                        onChange={(value) => field.handleChange(value || '')}
                        onBlur={field.handleBlur}
                        error={error}
                        filterType={transactionType}
                        searchable
                      />
                      {error && (
                        <div className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {error}
                        </div>
                      )}
                      {quickCategoryButtons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {quickCategoryButtons.map((cat) => {
                            const IconComponent = cat.icon
                              ? getCategoryIcon(cat.icon)
                              : null;
                            return (
                              <Button
                                key={cat.id}
                                type="button"
                                variant={
                                  field.state.value === cat.id
                                    ? 'filled'
                                    : 'outline'
                                }
                                size="xs"
                                onClick={() => field.handleChange(cat.id)}
                                leftSection={
                                  IconComponent ? (
                                    <IconComponent
                                      style={{
                                        fontSize: 16,
                                        color: cat.color || 'inherit',
                                        opacity: 0.8,
                                      }}
                                    />
                                  ) : null
                                }
                              >
                                {cat.name}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }}
              </form.Field>

              <form.Field name="note">
                {(field) => {
                  return (
                    <Textarea
                      label={t('transactions.description')}
                      placeholder={t('transactions.descriptionPlaceholder')}
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      rows={3}
                    />
                  );
                }}
              </form.Field>

              <form.Field name="borrowToPay">
                {(field) => {
                  return (
                    <Switch
                      label={t('transactions.borrowToPay')}
                      checked={field.state.value ?? false}
                      onChange={(e) =>
                        field.handleChange(e.currentTarget.checked)
                      }
                      onBlur={field.handleBlur}
                    />
                  );
                }}
              </form.Field>

              <form.Field name="fee">
                {(field) => {
                  return (
                    <div>
                      <Switch
                        label={t('transactions.fee')}
                        checked={feeEnabled}
                        onChange={(e) => {
                          setFeeEnabled(e.currentTarget.checked);
                          if (!e.currentTarget.checked) {
                            field.handleChange(0);
                          }
                        }}
                        onBlur={field.handleBlur}
                        mb="xs"
                      />
                      {feeEnabled && (
                        <NumberInput
                          label={t('transactions.fee')}
                          placeholder={t('transactions.feePlaceholder')}
                          value={field.state.value ?? 0}
                          onChange={(value) =>
                            field.handleChange(Number(value) || 0)
                          }
                          onBlur={field.handleBlur}
                          thousandSeparator=","
                          decimalScale={2}
                          min={0}
                          prefix={currencySymbol ? `${currencySymbol} ` : ''}
                        />
                      )}
                    </div>
                  );
                }}
              </form.Field>
            </div>
          </div>

          <form.Subscribe
            selector={(state) => ({
              isValid: state.isValid,
              values: state.values,
            })}
          >
            {({ isValid, values }) => {
              const isFormValid =
                isValid &&
                values.amount > 0 &&
                values.accountId !== '' &&
                values.categoryId !== '' &&
                values.date !== '';

              return (
                <Group justify="flex-end" mt="md">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSaveAndAdd(true);
                      form.handleSubmit();
                    }}
                    disabled={isLoading || !isFormValid}
                  >
                    {t('transactions.saveAndAdd')}
                  </Button>
                  <Button type="submit" disabled={isLoading || !isFormValid}>
                    {isLoading
                      ? t('common.saving', { defaultValue: 'Saving...' })
                      : t('common.save')}
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

export default AddEditTransactionDialog;
