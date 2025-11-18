import { useAdjustBalanceMutation } from '@client/hooks/mutations/useTransactionMutations';
import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  DateTimeField,
  NumberField,
  SelectField,
  TextareaField,
} from '../forms';

export const createBalanceAdjustmentSchema = (currentBalance: number | null) =>
  z.object({
    accountId: z.string().min(1, 'transactions.accountRequired'),
    newBalance: z
      .number()
      .min(0, 'transactions.newBalanceRequired')
      .refine(
        (val) => currentBalance === null || val !== currentBalance,
        'New balance must be different from current balance',
      ),
    date: z.string().min(1, 'transactions.dateRequired'),
    note: z.string().optional(),
  });

export type BalanceAdjustmentFormValue = z.infer<
  ReturnType<typeof createBalanceAdjustmentSchema>
>;

type AdjustBalanceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const AdjustBalanceDialog = ({
  isOpen,
  onClose,
}: AdjustBalanceDialogProps) => {
  const { t } = useTranslation();
  const { data: accountsData } = useAccountsOptionsQuery();
  const adjustBalanceMutation = useAdjustBalanceMutation();

  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const accountOptions = useMemo(() => {
    return (
      accountsData?.accounts.map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currency.code})`,
      })) || []
    );
  }, [accountsData]);

  const balanceAdjustmentDefaultValues: BalanceAdjustmentFormValue = {
    accountId: '',
    newBalance: 0,
    date: new Date().toISOString(),
    note: '',
  };

  const balanceAdjustmentSchema = useMemo(
    () => createBalanceAdjustmentSchema(currentBalance),
    [currentBalance],
  );

  const {
    control: balanceAdjustmentControl,
    handleSubmit: handleBalanceAdjustmentSubmit,
    reset: resetBalanceAdjustment,
    watch: watchBalanceAdjustment,
  } = useZodForm({
    zod: balanceAdjustmentSchema,
    defaultValues: balanceAdjustmentDefaultValues,
  });

  const balanceAdjustmentAccountId = watchBalanceAdjustment('accountId');
  const newBalanceValue = watchBalanceAdjustment('newBalance');

  const selectedBalanceAdjustmentAccount = useMemo(() => {
    if (!balanceAdjustmentAccountId) return null;
    return accountsData?.accounts.find(
      (acc) => acc.id === balanceAdjustmentAccountId,
    );
  }, [balanceAdjustmentAccountId, accountsData]);

  useEffect(() => {
    if (selectedBalanceAdjustmentAccount) {
      const balance = parseFloat(selectedBalanceAdjustmentAccount.balance);
      setCurrentBalance(balance);
    } else {
      setCurrentBalance(null);
    }
  }, [selectedBalanceAdjustmentAccount]);

  const balanceDifference = useMemo(() => {
    if (currentBalance === null || newBalanceValue === undefined) return null;
    return newBalanceValue - currentBalance;
  }, [currentBalance, newBalanceValue]);

  const handleClose = () => {
    resetBalanceAdjustment(balanceAdjustmentDefaultValues);
    setCurrentBalance(null);
    onClose();
  };

  const onSubmitForm = handleBalanceAdjustmentSubmit(async (data) => {
    if (currentBalance === null || data.newBalance === currentBalance) {
      return;
    }

    try {
      await adjustBalanceMutation.mutateAsync({
        accountId: data.accountId,
        newBalance: data.newBalance,
        date: data.date,
        note: data.note,
      });
      handleClose();
    } catch (_error) {
      /* handled by mutation */
    }
  });

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={t('transactions.adjustBalance')}
      size="md"
      centered
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <SelectField
            control={balanceAdjustmentControl}
            name="accountId"
            label={t('transactions.account')}
            placeholder={t('transactions.selectAccount')}
            required
            data={accountOptions}
            searchable
          />

          {selectedBalanceAdjustmentAccount && currentBalance !== null && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {t('transactions.currentBalance', {
                  defaultValue: 'Current Balance',
                })}
              </Text>
              <Text
                size="lg"
                c={
                  selectedBalanceAdjustmentAccount.currency.symbol
                    ? undefined
                    : 'dimmed'
                }
              >
                {selectedBalanceAdjustmentAccount.currency.symbol}{' '}
                {currentBalance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </Stack>
          )}

          <NumberField
            control={balanceAdjustmentControl}
            name="newBalance"
            label={t('transactions.newBalance', {
              defaultValue: 'New Balance',
            })}
            placeholder={`0 ${
              selectedBalanceAdjustmentAccount?.currency.symbol || ''
            }`}
            required
            decimalScale={2}
            min={0}
            prefix={
              selectedBalanceAdjustmentAccount?.currency.symbol
                ? `${selectedBalanceAdjustmentAccount.currency.symbol} `
                : ''
            }
          />

          {balanceDifference !== null && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {t('transactions.balanceDifference', {
                  defaultValue: 'Difference',
                })}
              </Text>
              <Text
                size="lg"
                c={
                  balanceDifference > 0
                    ? 'green'
                    : balanceDifference < 0
                      ? 'red'
                      : 'dimmed'
                }
              >
                {balanceDifference > 0 ? '+' : ''}
                {selectedBalanceAdjustmentAccount?.currency.symbol}{' '}
                {balanceDifference.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </Stack>
          )}

          <DateTimeField
            control={balanceAdjustmentControl}
            name="date"
            label={t('transactions.date')}
            placeholder={t('transactions.selectDate')}
            required
            valueFormat="DD/MM/YYYY HH:mm"
          />

          <TextareaField
            control={balanceAdjustmentControl}
            name="note"
            label={t('transactions.description')}
            placeholder={t('transactions.descriptionPlaceholder')}
            rows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={adjustBalanceMutation.isPending}>
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
