import { useZodForm } from '@client/hooks/useZodForm';
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
} from '@mantine/core';
import type { AccountResponse } from '@server/dto/account.dto';
import type { CategoryTreeResponse } from '@server/dto/category.dto';
import type { EntityResponse } from '@server/dto/entity.dto';
import type {
  IUpsertTransaction,
  TransactionDetail,
} from '@server/dto/transaction.dto';
import { TransactionType } from '@server/generated';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import CategorySelect from '../CategorySelect';
import EventSelect from '../EventSelect';
import {
  DateTimeField,
  FormRow,
  FormSection,
  NumberField,
  SelectField,
  SwitchField,
  TextareaField,
} from '../forms';
import { flattenCategories, getCategoryIcon } from '../utils/category';
import { ZodFormController } from '../ZodFormController';
import { DialogFooter } from './base/DialogFooter';

const baseSchema = z.object({
  id: z.string().optional(),
  amount: z.number().min(0.01, 'transactions.amountRequired'),
  accountId: z.string().min(1, 'transactions.accountRequired'),
  toAccountId: z.string().optional(),
  toAmount: z.number().optional(),
  date: z.string().min(1, 'transactions.dateRequired'),
  categoryId: z.string().optional(),
  entityId: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  note: z.string().optional(),
  fee: z.number().optional(),
  borrowToPay: z.boolean().optional(),
});

type FormValue = z.infer<typeof baseSchema>;

type AddEditTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionDetail | null;
  onSubmit: (data: IUpsertTransaction, saveAndAdd: boolean) => void;
  isLoading?: boolean;
  accounts?: AccountResponse[];
  categories?: CategoryTreeResponse[];
  entities?: EntityResponse[];
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

  const getInitialTab = () => {
    if (!transaction) return TransactionType.expense;
    if (transaction.type === TransactionType.income)
      return TransactionType.income;
    if (transaction.type === TransactionType.transfer)
      return TransactionType.transfer;
    const debtTypes = [
      TransactionType.loan_given,
      TransactionType.loan_received,
      TransactionType.repay_debt,
      TransactionType.collect_debt,
    ] as const;
    if (debtTypes.includes(transaction.type as (typeof debtTypes)[number])) {
      return 'debt';
    }
    return TransactionType.expense;
  };

  const getInitialDebtType = () => {
    if (!transaction) return 'borrow';
    if (transaction.type === TransactionType.loan_received) return 'borrow';
    if (transaction.type === TransactionType.loan_given) return 'lend';
    if (transaction.type === TransactionType.repay_debt) return 'repay_debt';
    if (transaction.type === TransactionType.collect_debt)
      return 'collect_debt';
    return 'borrow';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  const [debtType, setDebtType] = useState<string>(getInitialDebtType());
  const [_saveAndAdd, setSaveAndAdd] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const accounts = accountsProp;
  const categories = categoriesProp;
  const entities = entitiesProp;

  const transactionType = useMemo(() => {
    if (activeTab === TransactionType.income) return TransactionType.income;
    if (activeTab === TransactionType.transfer) return TransactionType.transfer;
    if (activeTab === 'adjust_balance') return 'adjust_balance' as const;
    if (activeTab === 'debt') {
      if (debtType === 'borrow') return TransactionType.loan_received;
      if (debtType === 'lend') return TransactionType.loan_given;
      if (debtType === 'repay_debt') return TransactionType.repay_debt;
      if (debtType === 'collect_debt') return TransactionType.collect_debt;
      return TransactionType.loan_received;
    }
    return TransactionType.expense;
  }, [activeTab, debtType]);

  const isBalanceAdjustment = activeTab === 'adjust_balance';

  const isLoanType = useMemo(() => {
    return (
      transactionType === TransactionType.loan_given ||
      transactionType === TransactionType.loan_received ||
      transactionType === TransactionType.repay_debt ||
      transactionType === TransactionType.collect_debt
    );
  }, [transactionType]);

  const categoryType = useMemo(() => {
    if (isLoanType) return 'loan' as const;
    if (transactionType === TransactionType.income) return 'income' as const;
    if (transactionType === TransactionType.expense) return 'expense' as const;
    return undefined;
  }, [transactionType, isLoanType]);

  const flattenedCategories = useMemo(() => {
    if (!categories || categories.length === 0 || !categoryType) {
      return [];
    }
    return flattenCategories(categories, t, categoryType);
  }, [categories, categoryType, t]);

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
    toAmount: 0,
    date: new Date().toISOString(),
    categoryId: '',
    entityId: null,
    eventId: null,
    note: '',
    fee: 0,
    borrowToPay: false,
  };

  const { control, handleSubmit, reset, watch, setValue } = useZodForm({
    zod: baseSchema,
    defaultValues,
  });

  const balanceAdjustmentDefaultValues: BalanceAdjustmentFormValue = {
    accountId: '',
    newBalance: 0,
    date: new Date().toISOString(),
    note: '',
  };

  const balanceAdjustmentSchema = useMemo(
    () => createBalanceAdjustmentSchema(currentBalance),
    [currentBalance],
  );

  const {
    control: balanceAdjustmentControl,
    handleSubmit: handleBalanceAdjustmentSubmit,
    reset: resetBalanceAdjustment,
    watch: watchBalanceAdjustment,
  } = useZodForm({
    zod: balanceAdjustmentSchema,
    defaultValues: balanceAdjustmentDefaultValues,
  });

  const balanceAdjustmentAccountId = watchBalanceAdjustment('accountId');
  const newBalanceValue = watchBalanceAdjustment('newBalance');

  const accountIdValue = watch('accountId');
  const toAccountIdValue = watch('toAccountId');
  const amountValue = watch('amount');
  const toAmountValue = watch('toAmount');

  const selectedAccount = useMemo(() => {
    if (!accountIdValue) return null;
    return accounts.find((acc) => acc.id === accountIdValue);
  }, [accountIdValue, accounts]);

  const selectedBalanceAdjustmentAccount = useMemo(() => {
    if (!balanceAdjustmentAccountId) return null;
    return accounts.find((acc) => acc.id === balanceAdjustmentAccountId);
  }, [balanceAdjustmentAccountId, accounts]);

  useEffect(() => {
    if (isBalanceAdjustment && selectedBalanceAdjustmentAccount) {
      const balance = parseFloat(selectedBalanceAdjustmentAccount.balance);
      setCurrentBalance(balance);
    } else {
      setCurrentBalance(null);
    }
  }, [isBalanceAdjustment, selectedBalanceAdjustmentAccount]);

  const balanceDifference = useMemo(() => {
    if (currentBalance === null || newBalanceValue === undefined) return null;
    return newBalanceValue - currentBalance;
  }, [currentBalance, newBalanceValue]);

  const adjustBalanceMutation = useAdjustBalanceMutation();

  const selectedToAccount = useMemo(() => {
    if (!toAccountIdValue) return null;
    return accounts.find((acc) => acc.id === toAccountIdValue);
  }, [toAccountIdValue, accounts]);

  const currencySymbol = selectedAccount?.currency.symbol || '';
  const toCurrencySymbol = selectedToAccount?.currency.symbol || '';
  const categoryIdValue = watch('categoryId');

  const isTransfer = transactionType === TransactionType.transfer;
  const currenciesMatch =
    isTransfer &&
    selectedAccount &&
    selectedToAccount &&
    selectedAccount.currencyId === selectedToAccount.currencyId;

  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isTransfer || !currenciesMatch || isSyncingRef.current) {
      return;
    }

    if (amountValue && amountValue > 0 && toAmountValue !== amountValue) {
      isSyncingRef.current = true;
      setValue('toAmount', amountValue, { shouldValidate: false });
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
  }, [amountValue, isTransfer, currenciesMatch, setValue, toAmountValue]);

  useEffect(() => {
    if (!isTransfer || !currenciesMatch || isSyncingRef.current) {
      return;
    }

    if (toAmountValue && toAmountValue > 0 && amountValue !== toAmountValue) {
      isSyncingRef.current = true;
      setValue('amount', toAmountValue, { shouldValidate: false });
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
  }, [toAmountValue, isTransfer, currenciesMatch, setValue, amountValue]);

  const handleClose = () => {
    reset(defaultValues);
    resetBalanceAdjustment(balanceAdjustmentDefaultValues);
    setSaveAndAdd(false);
    const tab = getInitialTab();
    setActiveTab(tab);
    if (tab === 'debt') {
      setDebtType(getInitialDebtType());
    } else {
      setDebtType('borrow');
    }
    setFeeEnabled(false);
    setCurrentBalance(null);
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
        toAmount: 0,
        date: transaction.date
          ? new Date(transaction.date).toISOString()
          : new Date().toISOString(),
        categoryId: transaction.categoryId || '',
        entityId: transaction.entityId || null,
        note: transaction.note || '',
        fee: feeValue,
        eventId: transaction.eventId || null,
        borrowToPay: (transaction.metadata as any)?.borrowToPay || false,
      });
      setFeeEnabled(feeValue > 0);
      const tab = getInitialTab();
      setActiveTab(tab);
      if (tab === 'debt') {
        setDebtType(getInitialDebtType());
      }
    } else {
      reset(defaultValues);
      setFeeEnabled(false);
    }
  }, [transaction, isOpen, reset]);

  const handleFormSubmit = (shouldSaveAndAdd: boolean) => {
    return handleSubmit((data) => {
      if (isBalanceAdjustment) {
        return;
      }

      if (transactionType === TransactionType.transfer) {
        if (!data.toAccountId || data.toAccountId === data.accountId) {
          return;
        }
      }

      const baseData = {
        accountId: data.accountId,
        amount: data.amount,
        date: data.date,
        ...(isEditMode && transaction ? { id: transaction.id } : {}),
        ...(data.note && data.note.trim() ? { note: data.note.trim() } : {}),
        ...(data.fee && data.fee > 0 ? { fee: data.fee } : {}),
        ...(data.eventId ? { eventId: data.eventId } : {}),
        ...(data.borrowToPay
          ? {
              metadata: {
                ...(transaction?.metadata || {}),
                borrowToPay: data.borrowToPay || undefined,
              },
            }
          : {}),
      };

      let submitData: IUpsertTransaction;

      if (transactionType === TransactionType.transfer) {
        if (!data.toAccountId) {
          return;
        }
        submitData = {
          ...baseData,
          type: TransactionType.transfer,
          toAccountId: data.toAccountId,
          ...(data.toAmount && data.toAmount > 0
            ? { toAmount: data.toAmount }
            : {}),
        } as IUpsertTransaction;
      } else if (
        transactionType === TransactionType.income ||
        transactionType === TransactionType.expense
      ) {
        submitData = {
          ...baseData,
          type: transactionType,
          categoryId: data.categoryId || '',
        } as IUpsertTransaction;
      } else if (
        transactionType === TransactionType.loan_given ||
        transactionType === TransactionType.loan_received ||
        transactionType === TransactionType.repay_debt ||
        transactionType === TransactionType.collect_debt
      ) {
        if (!data.entityId || !data.categoryId) {
          return;
        }
        submitData = {
          ...baseData,
          type: transactionType,
          entityId: data.entityId,
          categoryId: data.categoryId,
        } as IUpsertTransaction;
      } else {
        throw new Error(`Invalid transaction type: ${transactionType}`);
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

  const handleBalanceAdjustmentFormSubmit = (shouldSaveAndAdd: boolean) => {
    return handleBalanceAdjustmentSubmit(async (data) => {
      if (currentBalance === null || data.newBalance === currentBalance) {
        return;
      }

      try {
        await adjustBalanceMutation.mutateAsync({
          accountId: data.accountId,
          newBalance: data.newBalance,
          date: data.date,
          note: data.note,
        });

        if (!shouldSaveAndAdd) {
          handleClose();
        } else {
          const currentAccountId = data.accountId;
          const currentDate = data.date;
          resetBalanceAdjustment(balanceAdjustmentDefaultValues);
          setTimeout(() => {
            resetBalanceAdjustment({
              ...balanceAdjustmentDefaultValues,
              accountId: currentAccountId,
              date: currentDate,
            });
          }, 0);
        }
      } catch (_error) {
        // Error is handled by mutation
      }
    });
  };

  const onSubmitBalanceAdjustmentForm =
    handleBalanceAdjustmentFormSubmit(false);
  const onSubmitBalanceAdjustmentFormAndAdd =
    handleBalanceAdjustmentFormSubmit(true);

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
        onSubmit={
          isBalanceAdjustment ? onSubmitBalanceAdjustmentForm : onSubmitForm
        }
      >
        <Stack gap="md">
          <Tabs
            value={activeTab}
            onChange={(value) => {
              if (value) {
                setActiveTab(value);
                if (value !== 'debt' && debtType) {
                  setDebtType('borrow');
                }
                if (value === 'debt' && !debtType) {
                  setDebtType('borrow');
                }
              }
            }}
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
              <Tabs.Tab value="debt">
                {t('transactions.debt', { defaultValue: 'Debt' })}
              </Tabs.Tab>
              <Tabs.Tab value="adjust_balance">
                {t('transactions.adjustBalance')}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {isBalanceAdjustment ? (
            <FormSection>
              <SelectField
                control={balanceAdjustmentControl}
                name="accountId"
                label={t('transactions.account')}
                placeholder={t('transactions.selectAccount')}
                required
                data={accountOptions}
                searchable
              />

              {selectedBalanceAdjustmentAccount && currentBalance !== null && (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {t('transactions.currentBalance', {
                      defaultValue: 'Current Balance',
                    })}
                  </Text>
                  <Text
                    size="lg"
                    c={
                      selectedBalanceAdjustmentAccount.currency.symbol
                        ? undefined
                        : 'dimmed'
                    }
                  >
                    {selectedBalanceAdjustmentAccount.currency.symbol}{' '}
                    {currentBalance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Stack>
              )}

              <NumberField
                control={balanceAdjustmentControl}
                name="newBalance"
                label={t('transactions.newBalance', {
                  defaultValue: 'New Balance',
                })}
                placeholder={`0 ${selectedBalanceAdjustmentAccount?.currency.symbol || ''}`}
                required
                decimalScale={2}
                min={0}
                prefix={
                  selectedBalanceAdjustmentAccount?.currency.symbol
                    ? `${selectedBalanceAdjustmentAccount.currency.symbol} `
                    : ''
                }
              />

              {balanceDifference !== null && (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {t('transactions.balanceDifference', {
                      defaultValue: 'Difference',
                    })}
                  </Text>
                  <Text
                    size="lg"
                    c={
                      balanceDifference > 0
                        ? 'green'
                        : balanceDifference < 0
                          ? 'red'
                          : 'dimmed'
                    }
                  >
                    {balanceDifference > 0 ? '+' : ''}
                    {selectedBalanceAdjustmentAccount?.currency.symbol}{' '}
                    {balanceDifference.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Stack>
              )}

              <DateTimeField
                control={balanceAdjustmentControl}
                name="date"
                label={t('transactions.date')}
                placeholder={t('transactions.selectDate')}
                required
                valueFormat="DD/MM/YYYY HH:mm"
              />

              <TextareaField
                control={balanceAdjustmentControl}
                name="note"
                label={t('transactions.description')}
                placeholder={t('transactions.descriptionPlaceholder')}
                rows={3}
              />
            </FormSection>
          ) : (
            <Stack gap="md">
              {activeTab === 'debt' && (
                <Select
                  label={t('transactions.debtType', {
                    defaultValue: 'Debt Type',
                  })}
                  placeholder={t('transactions.selectDebtType', {
                    defaultValue: 'Select debt type',
                  })}
                  required
                  searchable
                  data={[
                    {
                      value: 'borrow',
                      label: t('categories.borrow', {
                        defaultValue: 'Borrow',
                      }),
                    },
                    {
                      value: 'lend',
                      label: t('categories.lend', {
                        defaultValue: 'Lend',
                      }),
                    },
                    {
                      value: 'repay_debt',
                      label: t('categories.repay_debt', {
                        defaultValue: 'Repay Debt',
                      }),
                    },
                    {
                      value: 'collect_debt',
                      label: t('categories.collect_debt', {
                        defaultValue: 'Collect Debt',
                      }),
                    },
                  ]}
                  value={debtType}
                  onChange={(value) => {
                    if (value) {
                      setDebtType(value);
                    }
                  }}
                />
              )}
              <FormRow cols={2}>
                <FormSection>
                  <NumberField
                    control={control}
                    name="amount"
                    label={
                      isTransfer
                        ? t('transactions.amountFrom', {
                            defaultValue: 'Amount From',
                          })
                        : t('transactions.amount')
                    }
                    placeholder={`0 ${currencySymbol}`}
                    required
                    decimalScale={2}
                    min={0}
                    prefix={currencySymbol ? `${currencySymbol} ` : ''}
                  />

                  {isTransfer && (
                    <NumberField
                      control={control}
                      name="toAmount"
                      label={t('transactions.amountTo', {
                        defaultValue: 'Amount To',
                      })}
                      placeholder={`0 ${toCurrencySymbol}`}
                      decimalScale={2}
                      min={0}
                      prefix={toCurrencySymbol ? `${toCurrencySymbol} ` : ''}
                    />
                  )}

                  <SelectField
                    control={control}
                    name="accountId"
                    label={t('transactions.account')}
                    placeholder={t('transactions.selectAccount')}
                    required
                    data={accountOptions}
                    searchable
                  />

                  {transactionType === TransactionType.transfer && (
                    <SelectField
                      control={control}
                      name="toAccountId"
                      label={t('transactions.transferTo')}
                      placeholder={t('transactions.selectAccount')}
                      required
                      data={accountOptions.filter(
                        (opt) => opt.value !== accountIdValue,
                      )}
                      searchable
                    />
                  )}

                  <DateTimeField
                    control={control}
                    name="date"
                    label={t('transactions.date')}
                    placeholder={t('transactions.selectDate')}
                    required
                    valueFormat="DD/MM/YYYY HH:mm"
                  />

                  <ZodFormController
                    control={control}
                    name="eventId"
                    render={({ field, fieldState: { error } }) => (
                      <EventSelect
                        value={field.value ?? null}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        error={typeof error === 'string' ? error : undefined}
                        clearable
                      />
                    )}
                  />

                  {!isLoanType && (
                    <SelectField
                      control={control}
                      name="entityId"
                      label={t('transactions.spendFor')}
                      placeholder={t('transactions.spendForPlaceholder')}
                      data={entityOptions}
                      searchable
                      clearable
                    />
                  )}
                </FormSection>

                <FormSection>
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
                            filterType={categoryType}
                            searchable
                            categories={categories}
                          />
                          {quickCategoryButtons.length > 0 && (
                            <Group wrap="wrap" gap="xs" mt="xs">
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
                            </Group>
                          )}
                        </div>
                      )}
                    />
                  )}

                  {isLoanType && (
                    <SelectField
                      control={control}
                      name="entityId"
                      label={t('transactions.entity')}
                      placeholder={t('transactions.selectEntity', {
                        defaultValue: 'Select entity',
                      })}
                      required
                      data={entityOptions}
                      searchable
                    />
                  )}

                  <TextareaField
                    control={control}
                    name="note"
                    label={t('transactions.description')}
                    placeholder={t('transactions.descriptionPlaceholder')}
                    rows={3}
                  />

                  {transactionType !== TransactionType.transfer &&
                    !isLoanType && (
                      <SwitchField
                        control={control}
                        name="borrowToPay"
                        label={t('transactions.borrowToPay')}
                      />
                    )}

                  <Stack gap="xs">
                    <Switch
                      label={t('transactions.fee')}
                      checked={feeEnabled}
                      onChange={(e) => {
                        setFeeEnabled(e.currentTarget.checked);
                        if (!e.currentTarget.checked) {
                          // Reset fee value when disabled
                          const currentFee = watch('fee');
                          if (currentFee) {
                            // Use setValue from useZodForm
                            setValue('fee', 0);
                          }
                        }
                      }}
                    />
                    {feeEnabled && (
                      <NumberField
                        control={control}
                        name="fee"
                        label={t('transactions.fee')}
                        placeholder={t('transactions.feePlaceholder')}
                        decimalScale={2}
                        min={0}
                        prefix={currencySymbol ? `${currencySymbol} ` : ''}
                      />
                    )}
                  </Stack>
                </FormSection>
              </FormRow>
            </Stack>
          )}

          <DialogFooter
            isEditMode={isEditMode}
            isLoading={isLoading || adjustBalanceMutation.isPending}
            onCancel={handleClose}
            onSave={
              isBalanceAdjustment ? onSubmitBalanceAdjustmentForm : onSubmitForm
            }
            onSaveAndAdd={
              isBalanceAdjustment
                ? onSubmitBalanceAdjustmentFormAndAdd
                : onSubmitFormAndAdd
            }
            showSaveAndAdd={!isBalanceAdjustment}
          />
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditTransactionDialog;
