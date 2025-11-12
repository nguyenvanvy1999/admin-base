import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import type {
  InvestmentFull,
  InvestmentTradeFormData,
} from '@client/types/investment';
import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { TradeSide } from '@server/generated/prisma/enums';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { NumberInput } from './NumberInput';
import { Select } from './Select';
import { ZodFormController } from './ZodFormController';

const baseSchema = z.object({
  side: z.nativeEnum(TradeSide),
  timestamp: z.string().min(1, 'investments.trade.dateRequired'),
  accountId: z.string().min(1, 'investments.trade.accountRequired'),
  price: z.number().min(0.01, 'investments.trade.priceRequired'),
  quantity: z.number().min(0.01, 'investments.trade.quantityRequired'),
  amount: z.number().min(0.01, 'investments.trade.amountRequired'),
  fee: z.number().optional(),
  amountInBaseCurrency: z.number().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyId: z.string().optional(),
});

type FormValue = z.infer<typeof baseSchema>;

type AddTradeDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentFull;
  onSubmit: (data: InvestmentTradeFormData) => Promise<void> | void;
  isLoading?: boolean;
};

const AddTradeDialog = ({
  isOpen,
  onClose,
  investment,
  onSubmit,
  isLoading = false,
}: AddTradeDialogProps) => {
  const { t } = useTranslation();

  const { data: accountsResponse } = useAccountsOptionsQuery();

  const filteredAccounts = useMemo(() => {
    if (!accountsResponse?.accounts) return [];
    // Filter by investment currencyId (not baseCurrencyId)
    // Trades are executed in the investment's currency
    const targetCurrencyId = investment.currencyId;
    const matched = accountsResponse.accounts.filter(
      (account) => account.currencyId === targetCurrencyId,
    );
    // If no accounts match the investment currency, show all accounts
    // This allows users to select any account even if currency doesn't match
    return matched.length > 0 ? matched : accountsResponse.accounts;
  }, [accountsResponse, investment]);

  const accountOptions = useMemo(
    () =>
      filteredAccounts.map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currency.code})`,
      })),
    [filteredAccounts],
  );

  const hasBaseCurrency = Boolean(investment.baseCurrencyId);

  const schema = hasBaseCurrency
    ? baseSchema
    : baseSchema.omit({
        amountInBaseCurrency: true,
        exchangeRate: true,
        baseCurrencyId: true,
      });

  const defaultValues: FormValue = {
    side: TradeSide.buy,
    timestamp: new Date().toISOString(),
    accountId: '',
    price: 0,
    quantity: 0,
    amount: 0,
    fee: 0,
    amountInBaseCurrency: 0,
    exchangeRate: 0,
    baseCurrencyId: investment.baseCurrencyId || '',
  };

  const { control, handleSubmit, reset, watch, setValue } = useZodForm({
    zod: schema,
    defaultValues,
  });

  const priceValue = watch('price');
  const quantityValue = watch('quantity');

  useEffect(() => {
    if (priceValue && quantityValue) {
      const computed = Number(priceValue) * Number(quantityValue);
      if (Number.isFinite(computed)) {
        setValue('amount', computed);
      }
    }
  }, [priceValue, quantityValue, setValue]);

  useEffect(() => {
    if (isOpen) {
      reset({
        ...defaultValues,
        accountId: accountOptions[0]?.value || '',
      });
    }
  }, [isOpen, accountOptions, reset]);

  const onSubmitForm = handleSubmit(async (data) => {
    const payload: InvestmentTradeFormData = {
      side: data.side,
      timestamp: data.timestamp,
      price: data.price,
      quantity: data.quantity,
      amount: data.amount,
      fee: data.fee || 0,
      currencyId: investment.currencyId,
      accountId: data.accountId,
      amountInBaseCurrency:
        hasBaseCurrency && data.amountInBaseCurrency
          ? data.amountInBaseCurrency
          : undefined,
      exchangeRate:
        hasBaseCurrency && data.exchangeRate ? data.exchangeRate : undefined,
      baseCurrencyId: hasBaseCurrency
        ? investment.baseCurrencyId || undefined
        : undefined,
    };

    await onSubmit(payload);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t('investments.addTrade', { defaultValue: 'Add trade' })}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <ZodFormController
            control={control}
            name="side"
            render={({ field }) => (
              <SegmentedControl
                fullWidth
                value={field.value || TradeSide.buy}
                onChange={(value) =>
                  field.onChange((value as TradeSide) || TradeSide.buy)
                }
                data={[
                  {
                    label: t('investments.trade.buy', { defaultValue: 'Buy' }),
                    value: TradeSide.buy,
                  },
                  {
                    label: t('investments.trade.sell', {
                      defaultValue: 'Sell',
                    }),
                    value: TradeSide.sell,
                  },
                ]}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="timestamp"
            render={({ field, fieldState: { error } }) => {
              const dateValue = field.value
                ? new Date(field.value)
                : new Date();
              return (
                <DateTimePicker
                  label={t('investments.trade.date', { defaultValue: 'Date' })}
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
                  required
                />
              );
            }}
          />

          <ZodFormController
            control={control}
            name="accountId"
            render={({ field, fieldState: { error } }) => (
              <Select
                required
                label={t('investments.trade.account', {
                  defaultValue: 'Settlement account',
                })}
                placeholder={t('investments.trade.accountPlaceholder', {
                  defaultValue: 'Select account',
                })}
                error={error}
                items={accountOptions}
                value={field.value || null}
                onChange={(value) => field.onChange(value || '')}
                searchable
              />
            )}
          />

          <ZodFormController
            control={control}
            name="price"
            render={({ field, fieldState: { error } }) => (
              <NumberInput
                label={t('investments.trade.price', { defaultValue: 'Price' })}
                error={error}
                value={field.value ?? 0}
                onChange={(value) => {
                  const numeric = Number(value) || 0;
                  field.onChange(numeric);
                }}
                min={0}
                decimalScale={6}
                thousandSeparator=","
                required
              />
            )}
          />

          <ZodFormController
            control={control}
            name="quantity"
            render={({ field, fieldState: { error } }) => (
              <NumberInput
                label={t('investments.trade.quantity', {
                  defaultValue: 'Quantity',
                })}
                error={error}
                value={field.value ?? 0}
                onChange={(value) => {
                  const numeric = Number(value) || 0;
                  field.onChange(numeric);
                }}
                min={0}
                decimalScale={8}
                thousandSeparator=","
                required
              />
            )}
          />

          <ZodFormController
            control={control}
            name="amount"
            render={({ field, fieldState: { error } }) => (
              <NumberInput
                label={t('investments.trade.amount', {
                  defaultValue: 'Amount',
                })}
                error={error}
                value={field.value ?? 0}
                onChange={(value) => field.onChange(Number(value) || 0)}
                min={0}
                decimalScale={2}
                thousandSeparator=","
                required
              />
            )}
          />

          <ZodFormController
            control={control}
            name="fee"
            render={({ field, fieldState: { error } }) => (
              <NumberInput
                label={t('investments.trade.fee', { defaultValue: 'Fee' })}
                error={error}
                value={field.value ?? 0}
                onChange={(value) => field.onChange(Number(value) || 0)}
                min={0}
                decimalScale={2}
                thousandSeparator=","
              />
            )}
          />

          {hasBaseCurrency && (
            <>
              <ZodFormController
                control={control}
                name="amountInBaseCurrency"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('investments.trade.amountInBaseCurrency', {
                      defaultValue: 'Amount in Base Currency',
                    })}
                    error={error}
                    value={field.value ?? 0}
                    onChange={(value) => field.onChange(Number(value) || 0)}
                    min={0}
                    decimalScale={2}
                    thousandSeparator=","
                  />
                )}
              />

              <ZodFormController
                control={control}
                name="exchangeRate"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('investments.trade.exchangeRate', {
                      defaultValue: 'Exchange Rate',
                    })}
                    error={error}
                    value={field.value ?? 0}
                    onChange={(value) => field.onChange(Number(value) || 0)}
                    min={0}
                    decimalScale={6}
                  />
                )}
              />
            </>
          )}

          <Text size="xs" c="dimmed">
            {t('investments.trade.currencyHint', {
              defaultValue:
                'All amounts are recorded in the investment currency.',
            })}
          </Text>

          <Group justify="flex-end">
            <Button
              variant="outline"
              onClick={onClose}
              type="button"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common.saving', { defaultValue: 'Saving...' })
                : t('common.add')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddTradeDialog;
