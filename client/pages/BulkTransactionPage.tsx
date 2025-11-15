import BulkTransactionTable, {
  type BulkTransactionRow,
} from '@client/components/BulkTransactionTable';
import { PageContainer } from '@client/components/PageContainer';
import { ZodFormController } from '@client/components/ZodFormController';
import { useCreateBatchTransactionsMutation } from '@client/hooks/mutations/useTransactionMutations';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, Stack, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import type { IUpsertTransaction } from '@server/dto/transaction.dto';
import { TransactionType } from '@server/generated/browser-index';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const defaultDateSchema = z.object({
  defaultDate: z.string().min(1, 'Date is required'),
});

const BulkTransactionPage = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BulkTransactionRow[]>([
    {
      id: `row-${Date.now()}`,
      type: TransactionType.expense,
      accountId: '',
      amount: 0,
      categoryId: '',
      fee: 0,
      entityId: null,
      eventId: null,
      date: new Date().toISOString(),
    },
  ]);
  const [rowErrors, setRowErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const { control, watch } = useZodForm({
    zod: defaultDateSchema,
    defaultValues: {
      defaultDate: new Date().toISOString(),
    },
  });

  const defaultDate = watch('defaultDate');

  const batchMutation = useCreateBatchTransactionsMutation();

  const validateRow = (row: BulkTransactionRow): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!row.type) {
      errors.type = t('transactions.typeRequired', {
        defaultValue: 'Type is required',
      });
    }

    if (!row.accountId) {
      errors.accountId = t('transactions.accountRequired', {
        defaultValue: 'Account is required',
      });
    }

    if (!row.amount || row.amount < 0.01) {
      errors.amount = t('transactions.amountRequired', {
        defaultValue: 'Amount must be at least 0.01',
      });
    }

    if (!row.categoryId) {
      errors.categoryId = t('transactions.categoryRequired', {
        defaultValue: 'Category is required',
      });
    }

    if (!row.date) {
      errors.date = t('transactions.dateRequired', {
        defaultValue: 'Date is required',
      });
    }

    return errors;
  };

  const validateAllRows = (): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    let hasErrors = false;

    rows.forEach((row) => {
      const errors = validateRow(row);
      if (Object.keys(errors).length > 0) {
        newErrors[row.id] = errors;
        hasErrors = true;
      }
    });

    setRowErrors(newErrors);
    return !hasErrors;
  };

  const handleRowsChange = (newRows: BulkTransactionRow[]) => {
    setRows(newRows);
    const newErrors: Record<string, Record<string, string>> = {};
    newRows.forEach((row) => {
      const errors = validateRow(row);
      if (Object.keys(errors).length > 0) {
        newErrors[row.id] = errors;
      }
    });
    setRowErrors(newErrors);
  };

  const handleSubmit = async () => {
    if (rows.length === 0) {
      return;
    }

    if (!validateAllRows()) {
      return;
    }

    const transactions: IUpsertTransaction[] = rows.map((row) => {
      const baseTransaction: IUpsertTransaction = {
        type: row.type,
        accountId: row.accountId,
        amount: row.amount,
        date: row.date,
        categoryId: row.categoryId,
      };

      if (row.fee && row.fee > 0) {
        baseTransaction.fee = row.fee;
      }

      if (row.entityId) {
        (baseTransaction as any).entityId = row.entityId;
      }

      if (row.eventId) {
        baseTransaction.eventId = row.eventId;
      }

      return baseTransaction;
    });

    try {
      await batchMutation.mutateAsync({ transactions });
      setRows([
        {
          id: `row-${Date.now()}`,
          type: TransactionType.expense,
          accountId: '',
          amount: 0,
          categoryId: '',
          fee: 0,
          entityId: null,
          eventId: null,
          date: defaultDate || new Date().toISOString(),
        },
      ]);
      setRowErrors({});
    } catch (error) {
      console.error('Failed to create batch transactions:', error);
    }
  };

  const canSubmit = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.every((row) => {
      const errors = validateRow(row);
      return Object.keys(errors).length === 0;
    });
  }, [rows]);

  return (
    <PageContainer
      buttonGroups={
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || batchMutation.isPending}
          loading={batchMutation.isPending}
        >
          {t('transactions.saveAll', { defaultValue: 'Save All' })}
        </Button>
      }
    >
      <Stack gap="md">
        <Group>
          <ZodFormController
            control={control}
            name="defaultDate"
            render={({ field, fieldState: { error } }) => {
              const dateValue = field.value
                ? new Date(field.value)
                : new Date();
              return (
                <DateTimePicker
                  label={t('transactions.defaultDate', {
                    defaultValue: 'Default Date',
                  })}
                  placeholder={t('transactions.selectDate', {
                    defaultValue: 'Select date',
                  })}
                  value={dateValue}
                  onChange={(value) => {
                    if (value) {
                      const dateValue =
                        typeof value === 'string'
                          ? new Date(value)
                          : value &&
                              typeof value === 'object' &&
                              'getTime' in value
                            ? (value as Date)
                            : new Date();
                      field.onChange(dateValue.toISOString());
                    }
                  }}
                  valueFormat="DD/MM/YYYY HH:mm"
                  error={error}
                  style={{ maxWidth: '300px' }}
                />
              );
            }}
          />
        </Group>

        <BulkTransactionTable
          rows={rows}
          onRowsChange={handleRowsChange}
          defaultDate={defaultDate}
          errors={rowErrors}
        />

        {rows.length > 0 && (
          <Text size="sm" c="dimmed">
            {t('transactions.totalRows', {
              defaultValue: 'Total rows: {{count}}',
              count: rows.length,
            })}
          </Text>
        )}
      </Stack>
    </PageContainer>
  );
};

export default BulkTransactionPage;
