import { NumberInput, TextInput } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import type { InvestmentResponse } from '@server/dto/investment.dto';
import {
  type IUpsertInvestmentValuationDto,
  UpsertInvestmentValuationDto,
} from '@server/dto/valuation.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ZodFormController } from '../ZodFormController';
import { CRUDDialog } from './CRUDDialog';

const baseSchema = UpsertInvestmentValuationDto.extend({
  price: z.number().min(0.01, 'investments.valuation.priceRequired'),
  timestamp: z.string().min(1, 'investments.valuation.dateRequired'),
});

type FormValue = z.infer<typeof baseSchema>;

type AddValuationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentResponse;
  onSubmit: (data: IUpsertInvestmentValuationDto) => Promise<void> | void;
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

  const schema = hasBaseCurrency
    ? baseSchema
    : baseSchema.omit({
        priceInBaseCurrency: true,
        exchangeRate: true,
        baseCurrencyId: true,
      });

  const defaultValues: FormValue = useMemo(
    () => ({
      price: 0,
      currencyId: investment.currencyId,
      timestamp: new Date().toISOString(),
      source: '',
      fetchedAt: '',
      priceInBaseCurrency: 0,
      exchangeRate: 0,
      baseCurrencyId: investment.baseCurrencyId || '',
    }),
    [investment],
  );

  const handleSubmit = async (data: FormValue) => {
    const payload: IUpsertInvestmentValuationDto = {
      price: data.price,
      currencyId: investment.currencyId,
      timestamp: data.timestamp,
      source: data.source?.trim() || undefined,
      fetchedAt: data.fetchedAt?.trim() || undefined,
      priceInBaseCurrency:
        hasBaseCurrency && data.priceInBaseCurrency
          ? data.priceInBaseCurrency
          : undefined,
      exchangeRate:
        hasBaseCurrency && data.exchangeRate ? data.exchangeRate : undefined,
      baseCurrencyId: hasBaseCurrency
        ? investment.baseCurrencyId || undefined
        : undefined,
    };

    await onSubmit(payload);
  };

  return (
    <CRUDDialog<null, FormValue>
      isOpen={isOpen}
      onClose={onClose}
      item={null}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('investments.addValuation', {
          defaultValue: 'Add valuation',
        }),
        edit: '', // Not used
      }}
      schema={schema}
      defaultValues={defaultValues}
      showSaveAndAdd={false}
      size="md"
    >
      {({ control }) => (
        <>
          <ZodFormController
            control={control}
            name="price"
            render={({ field, fieldState: { error } }) => (
              <NumberInput
                label={t('investments.valuation.price', {
                  defaultValue: 'Price / NAV',
                })}
                error={error}
                value={field.value ?? 0}
                onChange={(value) => field.onChange(Number(value) || 0)}
                min={0}
                decimalScale={6}
                thousandSeparator=","
                required
              />
            )}
          />

          <ZodFormController
            control={control}
            name="timestamp"
            render={({ field, fieldState: { error } }) => (
              <DateTimePicker
                label={t('investments.valuation.date', {
                  defaultValue: 'Valuation date',
                })}
                error={error}
                value={field.value ? new Date(field.value) : new Date()}
                onChange={(value) => {
                  if (value) {
                    field.onChange(value.toString());
                  }
                }}
                valueFormat="DD/MM/YYYY HH:mm"
                required
              />
            )}
          />

          {hasBaseCurrency && (
            <>
              <ZodFormController
                control={control}
                name="priceInBaseCurrency"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('investments.valuation.priceInBaseCurrency', {
                      defaultValue: 'Price in Base Currency',
                    })}
                    error={error}
                    value={field.value ?? 0}
                    onChange={(value) => field.onChange(Number(value) || 0)}
                    min={0}
                    decimalScale={6}
                    thousandSeparator=","
                  />
                )}
              />

              <ZodFormController
                control={control}
                name="exchangeRate"
                render={({ field, fieldState: { error } }) => (
                  <NumberInput
                    label={t('investments.valuation.exchangeRate', {
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

          <ZodFormController
            control={control}
            name="source"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('investments.valuation.source', {
                  defaultValue: 'Source',
                })}
                placeholder={t('investments.valuation.sourcePlaceholder', {
                  defaultValue: 'Optional data source',
                })}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="fetchedAt"
            render={({ field, fieldState: { error } }) => (
              <DateTimePicker
                label={t('investments.valuation.fetchedAt', {
                  defaultValue: 'Fetched at',
                })}
                placeholder={t('investments.valuation.fetchedAtPlaceholder', {
                  defaultValue: 'Optional fetch timestamp',
                })}
                error={error}
                clearable
                value={field.value ? new Date(field.value) : null}
                onChange={(value) => {
                  if (!value) {
                    field.onChange('');
                    return;
                  }
                  field.onChange(value.toString());
                }}
                valueFormat="DD/MM/YYYY HH:mm"
              />
            )}
          />
        </>
      )}
    </CRUDDialog>
  );
};

export default AddValuationDialog;
