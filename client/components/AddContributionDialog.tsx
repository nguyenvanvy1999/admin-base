import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import type { AccountFull } from '@client/types/account';
import type {
  InvestmentContributionFormData,
  InvestmentFull,
} from '@client/types/investment';
import { Button, Group, Modal, Stack } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { ContributionType } from '@server/generated/prisma/enums';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { NumberInput } from './NumberInput';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { ZodFormController } from './ZodFormController';

const baseSchema = z.object({
  amount: z.number().min(0.01, 'investments.contribution.amountRequired'),
  type: z.nativeEnum(ContributionType),
  timestamp: z.string().min(1, 'investments.contribution.dateRequired'),
  accountId: z.string().optional(),
  note: z.string().optional(),
  amountInBaseCurrency: z.number().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyId: z.string().optional(),
});

type FormValue = z.infer<typeof baseSchema>;

type AddContributionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentFull;
  onSubmit: (data: InvestmentContributionFormData) => Promise<void> | void;
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
    const targetCurrencyId = investment.baseCurrencyId
      ? investment.baseCurrencyId
      : investment.currencyId;
    return accountsResponse.accounts.filter(
      (account) => account.currencyId === targetCurrencyId,
    );
  }, [accountsResponse, investment]);

  const accountOptions = useMemo(
    () =>
      filteredAccounts.map((account: AccountFull) => ({
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
    amount: 0,
    type: ContributionType.deposit,
    timestamp: new Date().toISOString(),
    accountId: '',
    note: '',
    amountInBaseCurrency: 0,
    exchangeRate: 0,
    baseCurrencyId: investment.baseCurrencyId || '',
  };

  const { control, handleSubmit, reset } = useZodForm({
    zod: schema,
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        ...defaultValues,
        accountId: accountOptions[0]?.value || '',
      });
    }
  }, [isOpen, accountOptions, reset]);

  const onSubmitForm = handleSubmit(async (data) => {
    const payload: InvestmentContributionFormData = {
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
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t('investments.addContribution', {
        defaultValue: 'Add contribution',
      })}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
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
                  onChange={(value) => {
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
                value={field.value || ''}
                onChange={field.onChange}
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

export default AddContributionDialog;
