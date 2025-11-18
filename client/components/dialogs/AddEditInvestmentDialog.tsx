import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { Textarea, TextInput } from '@mantine/core';
import {
  type InvestmentResponse,
  type IUpsertInvestmentDto,
  UpsertInvestmentDto,
} from '@server/dto/investment.dto';
import { InvestmentAssetType, InvestmentMode } from '@server/generated';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Select } from '../Select';
import { ZodFormController } from '../ZodFormController';
import { CRUDDialog } from './CRUDDialog';

const schema = UpsertInvestmentDto.extend({
  name: z.string().min(1, 'investments.nameRequired'),
  symbol: z.string().min(1, 'investments.symbolRequired'),
  assetType: z.enum(InvestmentAssetType),
  mode: z.enum(InvestmentMode),
  currencyId: z.string().min(1, 'investments.currencyRequired'),
});

type FormValue = z.infer<typeof schema>;

type AddEditInvestmentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentResponse | null;
  onSubmit: (data: IUpsertInvestmentDto) => Promise<void> | void;
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

  const getFormValues = (inv: InvestmentResponse): FormValue => ({
    id: inv.id,
    name: inv.name,
    symbol: inv.symbol,
    assetType: inv.assetType,
    mode:
      inv.mode === InvestmentMode.priced || inv.mode === InvestmentMode.manual
        ? inv.mode
        : InvestmentMode.priced,
    currencyId: inv.currencyId,
    baseCurrencyId: inv.baseCurrencyId || '',
    extra: inv.extra ? JSON.stringify(inv.extra, null, 2) : '',
  });

  const handleSubmit = async (data: FormValue) => {
    setExtraError(null);

    let parsedExtra: Record<string, unknown> | null = null;
    if (
      data.extra &&
      typeof data.extra === 'string' &&
      data.extra.trim() !== ''
    ) {
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

    const payload: IUpsertInvestmentDto = {
      name: data.name.trim(),
      symbol: data.symbol.trim(),
      assetType: data.assetType,
      mode: data.mode,
      currencyId: data.currencyId,
      baseCurrencyId: data.baseCurrencyId || undefined,
      extra: parsedExtra ?? undefined,
    };

    if (investment) {
      payload.id = investment.id;
    }

    await onSubmit(payload);
  };

  return (
    <CRUDDialog<InvestmentResponse, FormValue>
      isOpen={isOpen}
      onClose={onClose}
      item={investment}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('investments.addInvestment', { defaultValue: 'New investment' }),
        edit: t('investments.editInvestment', {
          defaultValue: 'Edit investment',
        }),
      }}
      schema={schema}
      defaultValues={defaultValues}
      getFormValues={getFormValues}
      showSaveAndAdd={false}
      size="md"
    >
      {({ control }) => (
        <>
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
                value={field.value || null}
                onChange={(value) => field.onChange(value || '')}
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
                value={field.value || null}
                onChange={(value) => field.onChange(value || '')}
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
                value={typeof field.value === 'string' ? field.value : ''}
              />
            )}
          />
        </>
      )}
    </CRUDDialog>
  );
};

export default AddEditInvestmentDialog;
