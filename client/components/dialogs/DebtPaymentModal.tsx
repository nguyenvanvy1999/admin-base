import { useCreateTransactionMutation } from '@client/hooks/mutations/useTransactionMutations';
import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { formatCurrency } from '@client/lib/format';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { TransactionType } from '@server/generated';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DateField, NumberField, TextareaField } from '../forms';
import { Select } from '../Select';
import { ZodFormController } from '../ZodFormController';

const paymentSchema = z.object({
  amount: z.number().min(1, 'debts.paymentModal.amountRequired'),
  date: z.string().min(1, 'transactions.dateRequired'),
  accountId: z.string().min(1, 'debts.paymentModal.accountRequired'),
  description: z.string().optional(),
});

type FormValue = z.infer<typeof paymentSchema>;

export const DebtPaymentModal = ({
  isOpen,
  onClose,
  transaction,
  type,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  type: 'pay' | 'receive';
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const { data: accountsData } = useAccountsOptionsQuery();
  const createMutation = useCreateTransactionMutation();

  const { control, handleSubmit, reset } = useZodForm({
    zod: paymentSchema,
    defaultValues: {
      amount: transaction?.remainingAmount || 0,
      date: new Date().toISOString(),
      accountId: '',
      description: '',
    },
  });

  useEffect(() => {
    if (transaction && isOpen) {
      reset({
        amount: transaction.remainingAmount || 0,
        date: new Date().toISOString(),
        accountId: '',
        description: '',
      });
    }
  }, [transaction, isOpen, reset]);

  const onSubmitForm = handleSubmit(async (values: FormValue) => {
    const paymentTransaction = {
      type:
        type === 'pay'
          ? TransactionType.repay_debt
          : TransactionType.collect_debt,
      amount: values.amount,
      date: values.date,
      accountId: values.accountId,
      description:
        values.description ||
        t('debts.paymentModal.defaultDescription', {
          id: transaction.id,
        }),
      loanTransactionId: transaction.id,
    };

    await createMutation.mutateAsync(paymentTransaction);
    onSuccess();
    onClose();
  });

  const accountOptions =
    accountsData?.accounts.map((account) => ({
      value: account.id,
      label: `${account.name} (${account.currency.code})`,
    })) || [];

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        type === 'pay'
          ? t('debts.paymentModal.payTitle')
          : t('debts.paymentModal.receiveTitle')
      }
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <Text>
            {type === 'pay'
              ? t('debts.paymentModal.amountToPay')
              : t('debts.paymentModal.amountToReceive')}
            :
            <Text fw={700} component="span" ml="sm">
              {formatCurrency(
                transaction?.remainingAmount || 0,
                transaction?.currency || 'VND',
              )}
            </Text>
          </Text>

          <NumberField
            control={control}
            name="amount"
            label={t('debts.paymentModal.amount')}
            required
          />

          <DateField
            control={control}
            name="date"
            label={t('debts.paymentModal.date')}
            placeholder={t('transactions.selectDate')}
            required
          />

          <ZodFormController
            control={control}
            name="accountId"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('debts.paymentModal.account')}
                placeholder={t('debts.paymentModal.accountPlaceholder')}
                items={accountOptions}
                value={field.value}
                onChange={field.onChange}
                searchable
                required
                error={error}
              />
            )}
          />

          <TextareaField
            control={control}
            name="description"
            label={t('debts.paymentModal.description')}
            placeholder={t('debts.paymentModal.descriptionPlaceholder')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              {t('debts.paymentModal.confirm')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
