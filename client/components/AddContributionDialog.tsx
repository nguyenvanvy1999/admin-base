import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
import type { AccountFull } from '@client/types/account';
import type {
  InvestmentContributionFormData,
  InvestmentFull,
} from '@client/types/investment';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { ContributionType } from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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

  const { data: accountsResponse } = useAccountsQuery({
    currencyId: investment.baseCurrencyId
      ? [investment.baseCurrencyId]
      : [investment.currencyId],
    limit: 100,
  });

  const accountOptions = useMemo(
    () =>
      (accountsResponse?.accounts || []).map((account: AccountFull) => ({
        value: account.id,
        label: `${account.name} (${account.currency.code})`,
      })),
    [accountsResponse],
  );

  const hasBaseCurrency = Boolean(investment.baseCurrencyId);

  const form = useForm({
    defaultValues: {
      amount: 0,
      type: ContributionType.deposit as ContributionType,
      timestamp: new Date().toISOString(),
      accountId: '',
      note: '',
      amountInBaseCurrency: 0,
      exchangeRate: 0,
      baseCurrencyId: investment.baseCurrencyId || '',
    },
    onSubmit: async ({ value }) => {
      const payload: InvestmentContributionFormData = {
        amount: Number(value.amount),
        currencyId: investment.currencyId,
        type: value.type as ContributionType,
        timestamp: value.timestamp,
        accountId: value.accountId ? value.accountId : undefined,
        note: value.note?.trim() ? value.note.trim() : undefined,
        amountInBaseCurrency:
          hasBaseCurrency && value.amountInBaseCurrency
            ? Number(value.amountInBaseCurrency)
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
      form.setFieldValue('amount', 0);
      form.setFieldValue('type', ContributionType.deposit);
      form.setFieldValue('timestamp', new Date().toISOString());
      form.setFieldValue('accountId', accountOptions[0]?.value || '');
      form.setFieldValue('note', '');
      form.setFieldValue('amountInBaseCurrency', 0);
      form.setFieldValue('exchangeRate', 0);
      form.setFieldValue('baseCurrencyId', investment.baseCurrencyId || '');
    }
  }, [isOpen, form, accountOptions, investment.baseCurrencyId]);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t('investments.addContribution', {
        defaultValue: 'Add contribution',
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
          <form.Field name="type">
            {(field) => (
              <Select
                label={t('investments.contribution.type', {
                  defaultValue: 'Type',
                })}
                data={[
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
                value={field.state.value || ContributionType.deposit}
                onChange={(value) => {
                  const selectedType =
                    (value as ContributionType) || ContributionType.deposit;
                  field.handleChange(selectedType);
                }}
                onBlur={field.handleBlur}
                required
              />
            )}
          </form.Field>

          <form.Field name="amount">
            {(field) => (
              <NumberInput
                label={t('investments.contribution.amount', {
                  defaultValue: 'Amount',
                })}
                value={Number(field.state.value) || 0}
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

          <form.Field name="timestamp">
            {(field) => (
              <DateTimePicker
                label={t('investments.contribution.date', {
                  defaultValue: 'Date',
                })}
                value={
                  field.state.value ? new Date(field.state.value) : new Date()
                }
                onChange={(value) => {
                  let dateValue: string;
                  if (
                    value &&
                    typeof value === 'object' &&
                    'toISOString' in value
                  ) {
                    dateValue = (value as Date).toISOString();
                  } else if (value) {
                    dateValue = new Date(value as string | Date).toISOString();
                  } else {
                    dateValue = new Date().toISOString();
                  }
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
                label={t('investments.contribution.account', {
                  defaultValue: 'Linked account',
                })}
                placeholder={t('investments.contribution.accountPlaceholder', {
                  defaultValue: 'Select account (optional)',
                })}
                data={accountOptions}
                value={field.state.value ? field.state.value : null}
                onChange={(value) => field.handleChange(value ?? '')}
                onBlur={field.handleBlur}
                searchable
                clearable
              />
            )}
          </form.Field>

          {hasBaseCurrency && (
            <>
              <form.Field name="amountInBaseCurrency">
                {(field) => (
                  <NumberInput
                    label={t('investments.contribution.amountInBaseCurrency', {
                      defaultValue: 'Amount in Base Currency',
                    })}
                    value={Number(field.state.value) || 0}
                    decimalScale={2}
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
                    label={t('investments.contribution.exchangeRate', {
                      defaultValue: 'Exchange Rate',
                    })}
                    value={Number(field.state.value) || 0}
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

          <form.Field name="note">
            {(field) => (
              <Textarea
                label={t('investments.contribution.note', {
                  defaultValue: 'Note',
                })}
                placeholder={t('investments.contribution.notePlaceholder', {
                  defaultValue: 'Optional note',
                })}
                minRows={3}
                value={field.state.value ?? ''}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
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
                Number(values.amount) !== 0 &&
                values.timestamp !== '';

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

export default AddContributionDialog;
