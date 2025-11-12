import type {
  InvestmentFull,
  InvestmentValuationFormData,
} from '@client/types/investment';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  TextInput,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type AddValuationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentFull;
  onSubmit: (data: InvestmentValuationFormData) => Promise<void> | void;
  isLoading?: boolean;
};

const AddValuationDialog = ({
  isOpen,
  onClose,
  investment,
  onSubmit,
  isLoading = false,
}: AddValuationDialogProps) => {
  const { t } = useTranslation();

  const hasBaseCurrency = Boolean(investment.baseCurrencyId);

  const form = useForm({
    defaultValues: {
      price: 0,
      timestamp: new Date().toISOString(),
      source: '',
      fetchedAt: '',
      priceInBaseCurrency: 0,
      exchangeRate: 0,
      baseCurrencyId: investment.baseCurrencyId || '',
    },
    onSubmit: async ({ value }) => {
      const payload: InvestmentValuationFormData = {
        price: Number(value.price),
        currencyId: investment.currencyId,
        timestamp: value.timestamp,
        source: value.source?.trim() ? value.source.trim() : undefined,
        fetchedAt: value.fetchedAt?.trim() ? value.fetchedAt : undefined,
        priceInBaseCurrency:
          hasBaseCurrency && value.priceInBaseCurrency
            ? Number(value.priceInBaseCurrency)
            : undefined,
        exchangeRate:
          hasBaseCurrency && value.exchangeRate
            ? Number(value.exchangeRate)
            : undefined,
        baseCurrencyId: hasBaseCurrency
          ? investment.baseCurrencyId || undefined
          : undefined,
      };

      await onSubmit(payload);
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setFieldValue('price', 0);
      form.setFieldValue('timestamp', new Date().toISOString());
      form.setFieldValue('source', '');
      form.setFieldValue('fetchedAt', '');
      form.setFieldValue('priceInBaseCurrency', 0);
      form.setFieldValue('exchangeRate', 0);
      form.setFieldValue('baseCurrencyId', investment.baseCurrencyId || '');
    }
  }, [isOpen, form, investment.baseCurrencyId]);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t('investments.addValuation', {
        defaultValue: 'Add valuation',
      })}
      size="md"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <form.Field name="price">
            {(field) => (
              <NumberInput
                label={t('investments.valuation.price', {
                  defaultValue: 'Price / NAV',
                })}
                value={Number(field.state.value) || 0}
                min={0}
                decimalScale={6}
                thousandSeparator=","
                onChange={(value) =>
                  field.handleChange(value !== null ? Number(value) : 0)
                }
                onBlur={field.handleBlur}
                required
              />
            )}
          </form.Field>

          <form.Field name="timestamp">
            {(field) => (
              <DateTimePicker
                label={t('investments.valuation.date', {
                  defaultValue: 'Valuation date',
                })}
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

          {hasBaseCurrency && (
            <>
              <form.Field name="priceInBaseCurrency">
                {(field) => (
                  <NumberInput
                    label={t('investments.valuation.priceInBaseCurrency', {
                      defaultValue: 'Price in Base Currency',
                    })}
                    value={Number(field.state.value) || 0}
                    min={0}
                    decimalScale={6}
                    thousandSeparator=","
                    onChange={(value) =>
                      field.handleChange(value !== null ? Number(value) : 0)
                    }
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>

              <form.Field name="exchangeRate">
                {(field) => (
                  <NumberInput
                    label={t('investments.valuation.exchangeRate', {
                      defaultValue: 'Exchange Rate',
                    })}
                    value={Number(field.state.value) || 0}
                    min={0}
                    decimalScale={6}
                    onChange={(value) =>
                      field.handleChange(value !== null ? Number(value) : 0)
                    }
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </>
          )}

          <form.Field name="source">
            {(field) => (
              <TextInput
                label={t('investments.valuation.source', {
                  defaultValue: 'Source',
                })}
                placeholder={t('investments.valuation.sourcePlaceholder', {
                  defaultValue: 'Optional data source',
                })}
                value={field.state.value ?? ''}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          <form.Field name="fetchedAt">
            {(field) => (
              <DateTimePicker
                label={t('investments.valuation.fetchedAt', {
                  defaultValue: 'Fetched at',
                })}
                placeholder={t('investments.valuation.fetchedAtPlaceholder', {
                  defaultValue: 'Optional fetch timestamp',
                })}
                clearable
                value={field.state.value ? new Date(field.state.value) : null}
                onChange={(value) => {
                  if (!value) {
                    field.handleChange('');
                    return;
                  }
                  const dateValue =
                    value instanceof Date
                      ? value.toISOString()
                      : new Date(value).toISOString();
                  field.handleChange(dateValue);
                }}
                onBlur={field.handleBlur}
                valueFormat="DD/MM/YYYY HH:mm"
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              isValid: state.isValid,
              values: state.values,
            })}
          >
            {({ isValid, values }) => {
              const canSubmit =
                isValid && Number(values.price) > 0 && values.timestamp !== '';

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

export default AddValuationDialog;
