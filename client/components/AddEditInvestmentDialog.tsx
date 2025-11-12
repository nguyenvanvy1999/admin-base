import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import type {
  InvestmentFormData,
  InvestmentFull,
} from '@client/types/investment';
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useValidation } from './utils/validation';

type AddEditInvestmentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentFull | null;
  onSubmit: (data: InvestmentFormData) => Promise<void> | void;
  isLoading?: boolean;
};

const AddEditInvestmentDialog = ({
  isOpen,
  onClose,
  investment,
  onSubmit,
  isLoading = false,
}: AddEditInvestmentDialogProps) => {
  const { t } = useTranslation();
  const { data: currencies = [] } = useCurrenciesQuery();
  const validation = useValidation();
  const isEditMode = Boolean(investment);
  const [extraError, setExtraError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      symbol: '',
      assetType: InvestmentAssetType.coin,
      mode: InvestmentMode.priced,
      currencyId: '',
      baseCurrencyId: '',
      extra: '',
    },
    onSubmit: async ({ value }) => {
      setExtraError(null);
      if (!value.currencyId || !value.name.trim()) {
        return;
      }

      let parsedExtra: Record<string, unknown> | null = null;
      if (value.extra && value.extra.trim() !== '') {
        try {
          parsedExtra = JSON.parse(value.extra);
        } catch {
          setExtraError(
            t('investments.extraInvalid', {
              defaultValue: 'Extra metadata must be valid JSON.',
            }),
          );
          return;
        }
      }

      const payload: InvestmentFormData = {
        name: value.name.trim(),
        symbol: value.symbol.trim(),
        assetType: value.assetType as InvestmentAssetType,
        mode: value.mode as InvestmentMode,
        currencyId: value.currencyId,
        baseCurrencyId: value.baseCurrencyId || undefined,
        extra: parsedExtra ?? undefined,
      };

      if (isEditMode && investment) {
        payload.id = investment.id;
      }

      await onSubmit(payload);
    },
  });

  useEffect(() => {
    if (investment) {
      form.setFieldValue('name', investment.name);
      form.setFieldValue('symbol', investment.symbol);
      form.setFieldValue('assetType', investment.assetType);
      form.setFieldValue('mode', investment.mode);
      form.setFieldValue('currencyId', investment.currencyId);
      form.setFieldValue('baseCurrencyId', investment.baseCurrencyId || '');
      form.setFieldValue(
        'extra',
        investment.extra ? JSON.stringify(investment.extra, null, 2) : '',
      );
    } else {
      form.reset();
    }
    setExtraError(null);
  }, [investment, isOpen, form]);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        isEditMode
          ? t('investments.editInvestment', { defaultValue: 'Edit investment' })
          : t('investments.addInvestment', { defaultValue: 'New investment' })
      }
      size="md"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <form.Field
            name="name"
            validators={{
              onChange: validation.required('investments.nameRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  required
                  label={t('investments.name', { defaultValue: 'Name' })}
                  placeholder={t('investments.namePlaceholder', {
                    defaultValue: 'Enter investment name',
                  })}
                  value={field.state.value ?? ''}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field
            name="symbol"
            validators={{
              onChange: validation.required('investments.symbolRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  required
                  label={t('investments.symbol', { defaultValue: 'Symbol' })}
                  placeholder={t('investments.symbolPlaceholder', {
                    defaultValue: 'Ticker or identifier',
                  })}
                  value={field.state.value ?? ''}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="assetType">
            {(field) => (
              <Select
                label={t('investments.assetType', {
                  defaultValue: 'Asset type',
                })}
                data={[
                  {
                    value: InvestmentAssetType.coin,
                    label: t('investments.asset.coin', {
                      defaultValue: 'Coin',
                    }),
                  },
                  {
                    value: InvestmentAssetType.ccq,
                    label: t('investments.asset.ccq', {
                      defaultValue: 'Mutual fund',
                    }),
                  },
                  {
                    value: InvestmentAssetType.custom,
                    label: t('investments.asset.custom', {
                      defaultValue: 'Custom',
                    }),
                  },
                ]}
                value={
                  (field.state.value as string) ?? InvestmentAssetType.coin
                }
                onChange={(value) =>
                  field.handleChange(
                    (value as InvestmentAssetType) ?? InvestmentAssetType.coin,
                  )
                }
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          <form.Field name="mode">
            {(field) => (
              <Select
                label={t('investments.mode', { defaultValue: 'Mode' })}
                data={[
                  {
                    value: InvestmentMode.priced,
                    label: t('investments.mode.priced', {
                      defaultValue: 'Market priced',
                    }),
                  },
                  {
                    value: InvestmentMode.manual,
                    label: t('investments.mode.manual', {
                      defaultValue: 'Manual valuation',
                    }),
                  },
                ]}
                value={(field.state.value as string) ?? InvestmentMode.priced}
                onChange={(value) =>
                  field.handleChange(
                    (value as InvestmentMode) ?? InvestmentMode.priced,
                  )
                }
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          <form.Field
            name="currencyId"
            validators={{
              onChange: validation.required('investments.currencyRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <Select
                  required
                  label={t('investments.currency', {
                    defaultValue: 'Currency',
                  })}
                  placeholder={t('investments.currencyPlaceholder', {
                    defaultValue: 'Select currency',
                  })}
                  data={currencies.map((currency) => ({
                    value: currency.id,
                    label: `${currency.code} - ${currency.name}`,
                  }))}
                  value={field.state.value ?? null}
                  onChange={(value) => field.handleChange(value ?? '')}
                  onBlur={field.handleBlur}
                  searchable
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="baseCurrencyId">
            {(field) => (
              <Select
                label={t('investments.baseCurrency', {
                  defaultValue: 'Base Currency (Optional)',
                })}
                placeholder={t('investments.baseCurrencyPlaceholder', {
                  defaultValue:
                    'Select base currency for multi-currency tracking',
                })}
                data={currencies.map((currency) => ({
                  value: currency.id,
                  label: `${currency.code} - ${currency.name}`,
                }))}
                value={field.state.value || null}
                onChange={(value) => field.handleChange(value || '')}
                onBlur={field.handleBlur}
                searchable
                clearable
              />
            )}
          </form.Field>

          <form.Field name="extra">
            {(field) => (
              <Textarea
                label={t('investments.extra', {
                  defaultValue: 'Metadata (JSON)',
                })}
                placeholder={t('investments.extraPlaceholder', {
                  defaultValue: 'Optional metadata in JSON format',
                })}
                minRows={4}
                value={field.state.value ?? ''}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                error={extraError ?? undefined}
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
                isValid &&
                values.name.trim() !== '' &&
                values.symbol.trim() !== '' &&
                values.currencyId.trim() !== '';

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
                      : isEditMode
                        ? t('common.save')
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

export default AddEditInvestmentDialog;
