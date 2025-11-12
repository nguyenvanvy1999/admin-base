import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import type {
  InvestmentFormData,
  InvestmentFull,
} from '@client/types/investment';
import { Button, Group, Modal, Stack } from '@mantine/core';
import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { TextInput } from './TextInput';
import { ZodFormController } from './ZodFormController';

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'investments.nameRequired'),
  symbol: z.string().min(1, 'investments.symbolRequired'),
  assetType: z.nativeEnum(InvestmentAssetType),
  mode: z.nativeEnum(InvestmentMode),
  currencyId: z.string().min(1, 'investments.currencyRequired'),
  baseCurrencyId: z.string().optional(),
  extra: z.string().optional(),
});

type FormValue = z.infer<typeof schema>;

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
  const isEditMode = Boolean(investment);
  const [extraError, setExtraError] = useState<string | null>(null);

  const defaultValues: FormValue = {
    name: '',
    symbol: '',
    assetType: InvestmentAssetType.coin,
    mode: InvestmentMode.priced,
    currencyId: '',
    baseCurrencyId: '',
    extra: '',
  };

  const { control, handleSubmit, reset } = useZodForm({
    zod: schema,
    defaultValues,
  });

  useEffect(() => {
    if (investment) {
      reset({
        id: investment.id,
        name: investment.name,
        symbol: investment.symbol,
        assetType: investment.assetType,
        mode:
          investment.mode === InvestmentMode.priced ||
          investment.mode === InvestmentMode.manual
            ? investment.mode
            : InvestmentMode.priced,
        currencyId: investment.currencyId,
        baseCurrencyId: investment.baseCurrencyId || '',
        extra: investment.extra
          ? JSON.stringify(investment.extra, null, 2)
          : '',
      });
    } else {
      reset(defaultValues);
    }
    setExtraError(null);
  }, [investment, isOpen, reset]);

  const onSubmitForm = handleSubmit(async (data) => {
    setExtraError(null);

    let parsedExtra: Record<string, unknown> | null = null;
    if (data.extra && data.extra.trim() !== '') {
      try {
        parsedExtra = JSON.parse(data.extra);
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
      name: data.name.trim(),
      symbol: data.symbol.trim(),
      assetType: data.assetType,
      mode: data.mode,
      currencyId: data.currencyId,
      baseCurrencyId: data.baseCurrencyId || undefined,
      extra: parsedExtra ?? undefined,
    };

    if (isEditMode && investment) {
      payload.id = investment.id;
    }

    await onSubmit(payload);
  });

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
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <ZodFormController
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                required
                label={t('investments.name', { defaultValue: 'Name' })}
                placeholder={t('investments.namePlaceholder', {
                  defaultValue: 'Enter investment name',
                })}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="symbol"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                required
                label={t('investments.symbol', { defaultValue: 'Symbol' })}
                placeholder={t('investments.symbolPlaceholder', {
                  defaultValue: 'Ticker or identifier',
                })}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="assetType"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('investments.assetType', {
                  defaultValue: 'Asset type',
                })}
                error={error}
                items={[
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
                value={field.value || InvestmentAssetType.coin}
                onChange={field.onChange}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="mode"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('investments.mode', { defaultValue: 'Mode' })}
                error={error}
                items={[
                  {
                    value: InvestmentMode.priced,
                    label: t('investments.modes.priced', {
                      defaultValue: 'Market priced',
                    }),
                  },
                  {
                    value: InvestmentMode.manual,
                    label: t('investments.modes.manual', {
                      defaultValue: 'Manual valuation',
                    }),
                  },
                ]}
                value={field.value ?? InvestmentMode.priced}
                onChange={(value) => {
                  if (
                    value === InvestmentMode.priced ||
                    value === InvestmentMode.manual
                  ) {
                    field.onChange(value);
                  } else {
                    field.onChange(InvestmentMode.priced);
                  }
                }}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="currencyId"
            render={({ field, fieldState: { error } }) => (
              <Select
                required
                label={t('investments.currency', {
                  defaultValue: 'Currency',
                })}
                placeholder={t('investments.currencyPlaceholder', {
                  defaultValue: 'Select currency',
                })}
                error={error}
                items={currencies.map((currency) => ({
                  value: currency.id,
                  label: `${currency.code} - ${currency.name}`,
                }))}
                value={field.value || ''}
                onChange={field.onChange}
                searchable
              />
            )}
          />

          <ZodFormController
            control={control}
            name="baseCurrencyId"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('investments.baseCurrency', {
                  defaultValue: 'Base Currency (Optional)',
                })}
                placeholder={t('investments.baseCurrencyPlaceholder', {
                  defaultValue:
                    'Select base currency for multi-currency tracking',
                })}
                error={error}
                items={currencies.map((currency) => ({
                  value: currency.id,
                  label: `${currency.code} - ${currency.name}`,
                }))}
                value={field.value || ''}
                onChange={field.onChange}
                searchable
                clearable
              />
            )}
          />

          <ZodFormController
            control={control}
            name="extra"
            render={({ field, fieldState: { error } }) => (
              <Textarea
                label={t('investments.extra', {
                  defaultValue: 'Metadata (JSON)',
                })}
                placeholder={t('investments.extraPlaceholder', {
                  defaultValue: 'Optional metadata in JSON format',
                })}
                minRows={4}
                error={extraError || error}
                {...field}
              />
            )}
          />

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
                : isEditMode
                  ? t('common.save')
                  : t('common.add')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditInvestmentDialog;
