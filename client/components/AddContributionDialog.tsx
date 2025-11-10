import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
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
      amount: 0,
      timestamp: new Date().toISOString(),
      accountId: '',
      note: '',
    },
    onSubmit: async ({ value }) => {
      const payload: InvestmentContributionFormData = {
        amount: Number(value.amount),
        currencyId: investment.currencyId,
        timestamp: value.timestamp,
        accountId: value.accountId ? value.accountId : undefined,
        note: value.note?.trim() ? value.note.trim() : undefined,
      };

      await onSubmit(payload);
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setFieldValue('amount', 0);
      form.setFieldValue('timestamp', new Date().toISOString());
      form.setFieldValue('accountId', accountOptions[0]?.value || '');
      form.setFieldValue('note', '');
    }
  }, [isOpen, form, accountOptions]);

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
