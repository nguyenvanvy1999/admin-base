import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
import type {
  InvestmentFull,
  InvestmentTradeFormData,
} from '@client/types/investment';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { TradeSide } from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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

  const { data: accountsResponse } = useAccountsQuery({
    currencyId: [investment.currencyId],
    limit: 100,
  });

  const accountOptions = useMemo(
    () =>
      (accountsResponse?.accounts || []).map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currency.code})`,
      })),
    [accountsResponse],
  );

  const form = useForm({
    defaultValues: {
      side: TradeSide.buy,
      timestamp: new Date().toISOString(),
      accountId: '',
      price: 0,
      quantity: 0,
      amount: 0,
      fee: 0,
    },
    onSubmit: async ({ value }) => {
      const payload: InvestmentTradeFormData = {
        side: value.side as TradeSide,
        timestamp: value.timestamp,
        price: Number(value.price),
        quantity: Number(value.quantity),
        amount: Number(value.amount),
        fee: Number(value.fee ?? 0),
        currencyId: investment.currencyId,
        accountId: value.accountId,
      };

      await onSubmit(payload);
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setFieldValue('side', TradeSide.buy);
      form.setFieldValue('timestamp', new Date().toISOString());
      form.setFieldValue('accountId', accountOptions[0]?.value || '');
      form.setFieldValue('price', 0);
      form.setFieldValue('quantity', 0);
      form.setFieldValue('amount', 0);
      form.setFieldValue('fee', 0);
    }
  }, [isOpen, form, accountOptions]);

  const handleAmountRecalculate = (price: number, quantity: number) => {
    const computed = Number(price) * Number(quantity);
    form.setFieldValue('amount', Number.isFinite(computed) ? computed : 0);
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t('investments.addTrade', { defaultValue: 'Add trade' })}
      size="md"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <form.Field name="side">
            {(field) => (
              <SegmentedControl
                fullWidth
                value={(field.state.value as TradeSide) ?? TradeSide.buy}
                onChange={(value) =>
                  field.handleChange((value as TradeSide) ?? TradeSide.buy)
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
          </form.Field>

          <form.Field name="timestamp">
            {(field) => (
              <DateTimePicker
                label={t('investments.trade.date', { defaultValue: 'Date' })}
                value={
                  field.state.value ? new Date(field.state.value) : new Date()
                }
                onChange={(value) => {
                  const dateValue =
                    value && value instanceof Date
                      ? value.toISOString()
                      : value
                        ? new Date(value).toISOString()
                        : new Date().toISOString();
                  field.handleChange(dateValue);
                }}
                onBlur={field.handleBlur}
                valueFormat="DD/MM/YYYY HH:mm"
              />
            )}
          </form.Field>

          <form.Field name="accountId">
            {(field) => (
              <Select
                required
                label={t('investments.trade.account', {
                  defaultValue: 'Settlement account',
                })}
                placeholder={t('investments.trade.accountPlaceholder', {
                  defaultValue: 'Select account',
                })}
                data={accountOptions}
                value={field.state.value || null}
                onChange={(value) => field.handleChange(value ?? '')}
                onBlur={field.handleBlur}
                searchable
              />
            )}
          </form.Field>

          <form.Field name="price">
            {(field) => (
              <NumberInput
                label={t('investments.trade.price', { defaultValue: 'Price' })}
                value={Number(field.state.value) || 0}
                min={0}
                decimalScale={6}
                thousandSeparator=","
                onChange={(value) => {
                  const numeric = Number(value) || 0;
                  field.handleChange(numeric);
                  const quantity = Number(form.getFieldValue('quantity') || 0);
                  handleAmountRecalculate(numeric, quantity);
                }}
                onBlur={field.handleBlur}
                required
              />
            )}
          </form.Field>

          <form.Field name="quantity">
            {(field) => (
              <NumberInput
                label={t('investments.trade.quantity', {
                  defaultValue: 'Quantity',
                })}
                value={Number(field.state.value) || 0}
                min={0}
                decimalScale={8}
                thousandSeparator=","
                onChange={(value) => {
                  const numeric = Number(value) || 0;
                  field.handleChange(numeric);
                  const price = Number(form.getFieldValue('price') || 0);
                  handleAmountRecalculate(price, numeric);
                }}
                onBlur={field.handleBlur}
                required
              />
            )}
          </form.Field>

          <form.Field name="amount">
            {(field) => (
              <NumberInput
                label={t('investments.trade.amount', {
                  defaultValue: 'Amount',
                })}
                value={Number(field.state.value) || 0}
                min={0}
                decimalScale={2}
                thousandSeparator=","
                onChange={(value) =>
                  field.handleChange(value !== null ? Number(value) : 0)
                }
                onBlur={field.handleBlur}
                required
              />
            )}
          </form.Field>

          <form.Field name="fee">
            {(field) => (
              <NumberInput
                label={t('investments.trade.fee', { defaultValue: 'Fee' })}
                value={Number(field.state.value) || 0}
                min={0}
                decimalScale={2}
                thousandSeparator=","
                onChange={(value) =>
                  field.handleChange(value !== null ? Number(value) : 0)
                }
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          <Text size="xs" c="dimmed">
            {t('investments.trade.currencyHint', {
              defaultValue:
                'All amounts are recorded in the investment currency.',
            })}
          </Text>

          <form.Subscribe
            selector={(state) => ({
              isValid: state.isValid,
              values: state.values,
            })}
          >
            {({ isValid, values }) => {
              const canSubmit =
                isValid &&
                values.accountId.trim() !== '' &&
                Number(values.price) > 0 &&
                Number(values.quantity) > 0 &&
                Number(values.amount) > 0;

              return (
                <Group justify="flex-end">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    type="button"
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isLoading || !canSubmit}>
                    {isLoading
                      ? t('common.saving', { defaultValue: 'Saving...' })
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

export default AddTradeDialog;
