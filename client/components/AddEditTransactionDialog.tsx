import { useZodForm } from '@client/hooks/useZodForm';
import type { AccountFull } from '@client/types/account';
import type { CategoryFull } from '@client/types/category';
import type { EntityFull } from '@client/types/entity';
import type {
  TransactionFormData,
  TransactionFull,
} from '@client/types/transaction';
import { Button, Group, Modal, Stack, Tabs } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { TransactionType } from '@server/generated/prisma/enums';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import CategorySelect from './CategorySelect';
import { NumberInput } from './NumberInput';
import { Select } from './Select';
import { Switch } from './Switch';
import { Textarea } from './Textarea';
import { TextInput } from './TextInput';
import { flattenCategories, getCategoryIcon } from './utils/category';
import { ZodFormController } from './ZodFormController';

const baseSchema = z.object({
  id: z.string().optional(),
  amount: z.number().min(0.01, 'transactions.amountRequired'),
  accountId: z.string().min(1, 'transactions.accountRequired'),
  toAccountId: z.string().optional(),
  date: z.string().min(1, 'transactions.dateRequired'),
  categoryId: z.string().optional(),
  entityId: z.string().nullable().optional(),
  tripEvent: z.string().optional(),
  note: z.string().optional(),
  fee: z.number().optional(),
  borrowToPay: z.boolean().optional(),
});

type FormValue = z.infer<typeof baseSchema>;

type AddEditTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionFull | null;
  onSubmit: (data: TransactionFormData, saveAndAdd: boolean) => void;
  isLoading?: boolean;
  accounts?: AccountFull[];
  categories?: CategoryFull[];
  entities?: EntityFull[];
};

const AddEditTransactionDialog = ({
  isOpen,
  onClose,
  transaction,
  onSubmit,
  isLoading = false,
  accounts: accountsProp = [],
  categories: categoriesProp = [],
  entities: entitiesProp = [],
}: AddEditTransactionDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!transaction;
  const [activeTab, setActiveTab] = useState<string>(
    transaction?.type === TransactionType.income
      ? TransactionType.income
      : transaction?.type === TransactionType.transfer
        ? TransactionType.transfer
        : TransactionType.expense,
  );
  const [_saveAndAdd, setSaveAndAdd] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);

  const accounts = accountsProp;
  const categories = categoriesProp;
  const entities = entitiesProp;

  const transactionType = useMemo(() => {
    if (activeTab === TransactionType.income) return TransactionType.income;
    if (activeTab === TransactionType.transfer) return TransactionType.transfer;
    return TransactionType.expense;
  }, [activeTab]);

  const flattenedCategories = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [];
    }
    return flattenCategories(categories, t, transactionType);
  }, [categories, transactionType, t]);

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
    if (!categories || categories.length === 0) {
      return [];
    }

    const findCategoryById = (
      cats: typeof categories,
      id: string,
    ): (typeof categories)[0] | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategoryById(cat.children as typeof categories, id);
          if (found) return found;
        }
      }
      return null;
    };

    return flattenedCategories
      .filter((opt) => {
        const cat = findCategoryById(categories, opt.value);
        return cat && cat.type === transactionType;
      })
      .slice(0, 7)
      .map((opt) => {
        const cat = findCategoryById(categories, opt.value);
        return {
          id: opt.value,
          name: opt.label.trim(),
          icon: opt.icon || cat?.name,
          color: opt.color,
        };
      });
  }, [flattenedCategories, categories, transactionType, t]);

  const defaultValues: FormValue = {
    amount: 0,
    accountId: '',
    toAccountId: '',
    date: new Date().toISOString(),
    categoryId: '',
    entityId: null,
    tripEvent: '',
    note: '',
    fee: 0,
    borrowToPay: false,
  };

  const { control, handleSubmit, reset, watch } = useZodForm({
    zod: baseSchema,
    defaultValues,
  });

  const accountIdValue = watch('accountId');
  const selectedAccount = useMemo(() => {
    if (!accountIdValue) return null;
    return accounts.find((acc) => acc.id === accountIdValue);
  }, [accountIdValue, accounts]);

  const currencySymbol = selectedAccount?.currency.symbol || '';
  const categoryIdValue = watch('categoryId');

  const handleClose = () => {
    reset(defaultValues);
    setSaveAndAdd(false);
    setActiveTab(
      transaction?.type === TransactionType.income
        ? TransactionType.income
        : transaction?.type === TransactionType.transfer
          ? TransactionType.transfer
          : TransactionType.expense,
    );
    setFeeEnabled(false);
    onClose();
  };

  useEffect(() => {
    if (transaction) {
      const feeValue = transaction.fee ? parseFloat(transaction.fee) : 0;
      reset({
        id: transaction.id,
        amount: parseFloat(transaction.amount),
        accountId: transaction.accountId,
        toAccountId: transaction.toAccountId || '',
        date: transaction.date
          ? new Date(transaction.date).toISOString()
          : new Date().toISOString(),
        categoryId: transaction.categoryId || '',
        entityId: transaction.entityId || null,
        note: transaction.note || '',
        fee: feeValue,
        tripEvent: (transaction.metadata as any)?.tripEvent || '',
        borrowToPay: (transaction.metadata as any)?.borrowToPay || false,
      });
      setFeeEnabled(feeValue > 0);
      setActiveTab(transaction.type);
    } else {
      reset(defaultValues);
      setFeeEnabled(false);
    }
  }, [transaction, isOpen, reset]);

  const handleFormSubmit = (shouldSaveAndAdd: boolean) => {
    return handleSubmit((data) => {
      if (transactionType === TransactionType.transfer) {
        if (!data.toAccountId || data.toAccountId === data.accountId) {
          return;
        }
      }

      const submitData: TransactionFormData = {
        type: transactionType,
        accountId: data.accountId,
        amount: data.amount,
        date: data.date,
      };

      if (isEditMode && transaction) {
        submitData.id = transaction.id;
      }

      if (transactionType !== TransactionType.transfer && data.categoryId) {
        submitData.categoryId = data.categoryId;
      }

      if (transactionType !== TransactionType.transfer && data.entityId) {
        submitData.entityId = data.entityId;
      }

      if (data.note && data.note.trim()) {
        submitData.note = data.note.trim();
      }

      if (data.fee && data.fee > 0) {
        submitData.fee = data.fee;
      }

      if (transactionType === TransactionType.transfer) {
        (submitData as any).toAccountId = data.toAccountId;
      }

      if (data.tripEvent || data.borrowToPay) {
        submitData.metadata = {
          ...(transaction?.metadata || {}),
          tripEvent: data.tripEvent || undefined,
          borrowToPay: data.borrowToPay || undefined,
        };
      }

      onSubmit(submitData, shouldSaveAndAdd);
      if (!shouldSaveAndAdd) {
        handleClose();
      } else {
        const currentAccountId = data.accountId;
        const currentDate = data.date;
        reset(defaultValues);
        if (currentAccountId) {
          // Keep account and date for next transaction
          setTimeout(() => {
            reset({
              ...defaultValues,
              accountId: currentAccountId,
              date: currentDate,
            });
          }, 0);
        }
        setSaveAndAdd(false);
      }
    });
  };

  const onSubmitForm = handleFormSubmit(false);
  const onSubmitFormAndAdd = handleFormSubmit(true);

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
      <form onSubmit={onSubmitForm}>
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
              <Tabs.Tab value={TransactionType.transfer}>
                {t('transactions.transfer')}
              </Tabs.Tab>
              <Tabs.Tab value="adjust_balance" disabled>
                {t('transactions.adjustBalance')}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <ZodFormController
                control={control}
                name="amount"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('transactions.amount')}
                    placeholder={`0 ${currencySymbol}`}
                    required
                    error={error}
                    value={field.value ?? 0}
                    onChange={(value) => field.onChange(Number(value) || 0)}
                    thousandSeparator=","
                    decimalScale={2}
                    min={0}
                    prefix={currencySymbol ? `${currencySymbol} ` : ''}
                  />
                )}
              />

              <ZodFormController
                control={control}
                name="accountId"
                render={({ field, fieldState: { error } }) => (
                  <Select
                    label={t('transactions.account')}
                    placeholder={t('transactions.selectAccount')}
                    required
                    error={error}
                    items={accountOptions}
                    value={field.value || ''}
                    onChange={field.onChange}
                    searchable
                  />
                )}
              />

              {transactionType === TransactionType.transfer && (
                <ZodFormController
                  control={control}
                  name="toAccountId"
                  render={({ field, fieldState: { error } }) => {
                    const toAccountOptions = accountOptions.filter(
                      (opt) => opt.value !== accountIdValue,
                    );
                    return (
                      <Select
                        label={t('transactions.transferTo')}
                        placeholder={t('transactions.selectAccount')}
                        required
                        error={error}
                        items={toAccountOptions}
                        value={field.value || ''}
                        onChange={field.onChange}
                        searchable
                      />
                    );
                  }}
                />
              )}

              <ZodFormController
                control={control}
                name="date"
                render={({ field, fieldState: { error } }) => {
                  const dateValue = field.value
                    ? new Date(field.value)
                    : new Date();
                  return (
                    <DateTimePicker
                      label={t('transactions.date')}
                      placeholder={t('transactions.selectDate')}
                      required
                      error={error}
                      value={dateValue}
                      onChange={(value: Date | string | null) => {
                        if (value) {
                          field.onChange(
                            (value instanceof Date
                              ? value
                              : new Date(value)
                            ).toISOString(),
                          );
                        }
                      }}
                      valueFormat="DD/MM/YYYY HH:mm"
                    />
                  );
                }}
              />

              <ZodFormController
                control={control}
                name="tripEvent"
                render={({ field, fieldState: { error } }) => (
                  <TextInput
                    label={t('transactions.tripEvent')}
                    placeholder={t('transactions.tripEventPlaceholder')}
                    error={error}
                    {...field}
                  />
                )}
              />

              <ZodFormController
                control={control}
                name="entityId"
                render={({ field, fieldState: { error } }) => (
                  <Select
                    label={t('transactions.spendFor')}
                    placeholder={t('transactions.spendForPlaceholder')}
                    error={error}
                    items={entityOptions}
                    value={field.value || ''}
                    onChange={(value) => field.onChange(value || null)}
                    searchable
                    clearable
                  />
                )}
              />
            </div>

            <div className="space-y-4">
              {transactionType !== TransactionType.transfer && (
                <ZodFormController
                  control={control}
                  name="categoryId"
                  render={({ field, fieldState: { error } }) => (
                    <div>
                      <CategorySelect
                        label={t('transactions.category')}
                        placeholder={t('transactions.selectCategory')}
                        required
                        value={field.value ? field.value : null}
                        onChange={(value) => {
                          field.onChange(value ?? '');
                        }}
                        error={error ? String(error) : undefined}
                        filterType={transactionType}
                        searchable
                        categories={categories}
                      />
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
                                  categoryIdValue === cat.id
                                    ? 'filled'
                                    : 'outline'
                                }
                                size="xs"
                                onClick={() => field.onChange(cat.id)}
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
                  )}
                />
              )}

              <ZodFormController
                control={control}
                name="note"
                render={({ field, fieldState: { error } }) => (
                  <Textarea
                    label={t('transactions.description')}
                    placeholder={t('transactions.descriptionPlaceholder')}
                    error={error}
                    rows={3}
                    {...field}
                  />
                )}
              />

              {transactionType !== TransactionType.transfer && (
                <ZodFormController
                  control={control}
                  name="borrowToPay"
                  render={({
                    field: { value, ...field },
                    fieldState: { error },
                  }) => (
                    <Switch
                      label={t('transactions.borrowToPay')}
                      error={error}
                      checked={value ?? false}
                      onChange={(e) => field.onChange(e.currentTarget.checked)}
                    />
                  )}
                />
              )}

              <ZodFormController
                control={control}
                name="fee"
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <Switch
                      label={t('transactions.fee')}
                      checked={feeEnabled}
                      onChange={(e) => {
                        setFeeEnabled(e.currentTarget.checked);
                        if (!e.currentTarget.checked) {
                          field.onChange(0);
                        }
                      }}
                      mb="xs"
                    />
                    {feeEnabled && (
                      <NumberInput
                        label={t('transactions.fee')}
                        placeholder={t('transactions.feePlaceholder')}
                        error={error}
                        value={field.value ?? 0}
                        onChange={(value) => field.onChange(Number(value) || 0)}
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        prefix={currencySymbol ? `${currencySymbol} ` : ''}
                      />
                    )}
                  </div>
                )}
              />
            </div>
          </div>

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
              onClick={(e) => {
                e.preventDefault();
                onSubmitFormAndAdd();
              }}
              disabled={isLoading}
            >
              {t('transactions.saveAndAdd')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common.saving', { defaultValue: 'Saving...' })
                : t('common.save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditTransactionDialog;
