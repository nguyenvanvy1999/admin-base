import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { NumberInput, Textarea } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import type { AccountResponse } from '@server/dto/account.dto';
import {
  CreateInvestmentContributionDto,
  type ICreateInvestmentContributionDto,
} from '@server/dto/contribution.dto';
import type { InvestmentResponse } from '@server/dto/investment.dto';
import { ContributionType } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Select } from '../Select';
import { ZodFormController } from '../ZodFormController';
import { CRUDDialog } from './CRUDDialog';

const baseSchema = CreateInvestmentContributionDto.extend({
  amount: z.number().min(0.01, 'investments.contribution.amountRequired'),
  timestamp: z.string().min(1, 'investments.contribution.dateRequired'),
});

type FormValue = z.infer<typeof baseSchema>;

type AddContributionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentResponse;
  onSubmit: (data: ICreateInvestmentContributionDto) => Promise<void> | void;
  isLoading?: boolean;
};

const AddContributionDialog = ({
  isOpen,
  onClose,
  investment,
  onSubmit,
  isLoading = false,
}: AddContributionDialogProps) => {
  const { t } = useTranslation();

  const { data: accountsResponse } = useAccountsOptionsQuery();

  const filteredAccounts = useMemo(() => {
    if (!accountsResponse?.accounts) return [];
    const targetCurrencyId = investment.currencyId;
    const matched = accountsResponse.accounts.filter(
      (account) => account.currencyId === targetCurrencyId,
    );
    return matched.length > 0 ? matched : accountsResponse.accounts;
  }, [accountsResponse, investment]);

  const accountOptions = useMemo(
    () =>
      filteredAccounts.map((account: AccountResponse) => ({
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

  const defaultValues: FormValue = useMemo(
    () => ({
      amount: 0,
      currencyId: investment.currencyId,
      type: ContributionType.deposit,
      timestamp: new Date().toISOString(),
      accountId: accountOptions[0]?.value || '',
      note: '',
      amountInBaseCurrency: 0,
      exchangeRate: 0,
      baseCurrencyId: investment.baseCurrencyId || '',
    }),
    [investment, accountOptions],
  );

  const handleSubmit = async (data: FormValue) => {
    const payload: ICreateInvestmentContributionDto = {
      amount: data.amount,
      currencyId: investment.currencyId,
      type: data.type,
      timestamp: data.timestamp,
      accountId: data.accountId || undefined,
      note: data.note?.trim() || undefined,
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
  };

  return (
    <CRUDDialog<null, FormValue>
      isOpen={isOpen}
      onClose={onClose}
      item={null}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('investments.addContribution', {
          defaultValue: 'Add contribution',
        }),
        edit: '', // Not used in add-only mode
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
            name="type"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('investments.contribution.type', {
                  defaultValue: 'Type',
                })}
                error={error}
                items={[
                  {
                    value: ContributionType.deposit,
                    label: t('investments.contribution.deposit', {
                      defaultValue: 'Deposit',
                    }),
                  },
                  {
                    value: ContributionType.withdrawal,
                    label: t('investments.contribution.withdrawal', {
                      defaultValue: 'Withdrawal',
                    }),
                  },
                ]}
                value={field.value || ContributionType.deposit}
                onChange={field.onChange}
                required
              />
            )}
          />

          <ZodFormController
            control={control}
            name="amount"
            render={({ field, fieldState: { error } }) => (
              <NumberInput
                label={t('investments.contribution.amount', {
                  defaultValue: 'Amount',
                })}
                error={error}
                value={field.value ?? 0}
                onChange={(value) => field.onChange(Number(value) || 0)}
                decimalScale={2}
                thousandSeparator=","
                required
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
                  label={t('investments.contribution.date', {
                    defaultValue: 'Date',
                  })}
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
                label={t('investments.contribution.account', {
                  defaultValue: 'Linked account',
                })}
                placeholder={t('investments.contribution.accountPlaceholder', {
                  defaultValue: 'Select account (optional)',
                })}
                error={error}
                items={accountOptions}
                value={field.value || null}
                onChange={(value) => field.onChange(value || '')}
                searchable
                clearable
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
                    label={t('investments.contribution.amountInBaseCurrency', {
                      defaultValue: 'Amount in Base Currency',
                    })}
                    error={error}
                    value={field.value ?? 0}
                    onChange={(value) => field.onChange(Number(value) || 0)}
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
                    label={t('investments.contribution.exchangeRate', {
                      defaultValue: 'Exchange Rate',
                    })}
                    error={error}
                    value={field.value ?? 0}
                    onChange={(value) => field.onChange(Number(value) || 0)}
                    decimalScale={6}
                  />
                )}
              />
            </>
          )}

          <ZodFormController
            control={control}
            name="note"
            render={({ field, fieldState: { error } }) => (
              <Textarea
                label={t('investments.contribution.note', {
                  defaultValue: 'Note',
                })}
                placeholder={t('investments.contribution.notePlaceholder', {
                  defaultValue: 'Optional note',
                })}
                error={error}
                minRows={3}
                {...field}
              />
            )}
          />
        </>
      )}
    </CRUDDialog>
  );
};

export default AddContributionDialog;
