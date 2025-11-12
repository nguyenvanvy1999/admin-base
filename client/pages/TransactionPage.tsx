import AddEditTransactionDialog from '@client/components/AddEditTransactionDialog';
import CategoryMultiSelect from '@client/components/CategoryMultiSelect';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { TextInput } from '@client/components/TextInput';
import TransactionTable from '@client/components/TransactionTable';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useUpdateTransactionMutation,
} from '@client/hooks/mutations/useTransactionMutations';
import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { useEntitiesOptionsQuery } from '@client/hooks/queries/useEntityQueries';
import {
  type FilterFormValue,
  useTransactionsQuery,
} from '@client/hooks/queries/useTransactionQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import type {
  TransactionFormData,
  TransactionFull,
} from '@client/types/transaction';
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberFormatter,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { TransactionType } from '@server/generated/prisma/enums';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
  types: z.array(z.nativeEnum(TransactionType)).optional(),
  accountIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  entityIds: z.array(z.string()).optional(),
});

const defaultFilterValues: FilterFormValue = {
  search: '',
  types: [],
  accountIds: [],
  categoryIds: [],
  entityIds: [],
};

const TransactionPage = () => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const formRef = useRef<FormComponentRef>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionFull | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionFull | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<
    'date' | 'amount' | 'type' | 'accountId'
  >('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { handleSubmit, control, reset } = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [page, limit, sortBy, sortOrder],
  );

  const { data, isLoading } = useTransactionsQuery(
    queryParams,
    formRef,
    handleSubmit,
  );
  const { data: accountsData } = useAccountsOptionsQuery();
  const { data: categoriesData } = useCategoriesQuery({});
  const { data: entitiesData } = useEntitiesOptionsQuery();

  const accounts = accountsData?.accounts || [];
  const categories = categoriesData?.categories || [];
  const entities = entitiesData?.entities || [];

  const createMutation = useCreateTransactionMutation();
  const updateMutation = useUpdateTransactionMutation();
  const deleteMutation = useDeleteTransactionMutation();

  const handleAdd = () => {
    setSelectedTransaction(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (transaction: TransactionFull) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleDelete = (transaction: TransactionFull) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTransaction(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const handleSubmitForm = async (
    formData: TransactionFormData,
    saveAndAdd: boolean,
  ) => {
    if (formData.id) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
    }
    if (!saveAndAdd) {
      handleDialogClose();
    }
  };

  const handleConfirmDelete = async () => {
    if (transactionToDelete) {
      await deleteMutation.mutateAsync(transactionToDelete.id);
      handleDeleteDialogClose();
    }
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const accountOptions = useMemo(() => {
    return accounts.map((account) => ({
      value: account.id,
      label: `${account.name} (${account.currency.code})`,
    }));
  }, [accounts]);

  const entityOptions = useMemo(() => {
    return entities.map((entity) => ({
      value: entity.id,
      label: entity.name,
    }));
  }, [entities]);

  const summary = data?.summary;

  const stats = useMemo(() => {
    if (!summary || summary.length === 0) return undefined;
    return summary.flatMap((item) => [
      {
        titleI18nKey: `transactions.totalIncome_${item.currency.code}` as any,
        value: (
          <NumberFormatter
            value={item.totalIncome}
            prefix={item.currency.symbol ? `${item.currency.symbol} ` : ''}
            thousandSeparator=","
            decimalScale={2}
          />
        ),
        color: isDark ? 'rgb(34 197 94)' : 'rgb(21 128 61)',
      },
      {
        titleI18nKey: `transactions.totalExpense_${item.currency.code}` as any,
        value: (
          <NumberFormatter
            value={item.totalExpense}
            prefix={item.currency.symbol ? `${item.currency.symbol} ` : ''}
            thousandSeparator=","
            decimalScale={2}
          />
        ),
        color: isDark ? 'rgb(248 113 113)' : 'rgb(185 28 28)',
      },
    ]);
  }, [summary, isDark]);

  return (
    <PageContainer
      filterGroup={
        <FormComponent ref={formRef}>
          <Group>
            <ZodFormController
              control={control}
              name="search"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  placeholder={t('transactions.search')}
                  error={error}
                  style={{ flex: 1, maxWidth: '300px' }}
                  {...field}
                />
              )}
            />
            <ZodFormController
              control={control}
              name="types"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('transactions.typePlaceholder')}
                  error={error}
                  data={[
                    {
                      value: TransactionType.income,
                      label: t('transactions.income'),
                    },
                    {
                      value: TransactionType.expense,
                      label: t('transactions.expense'),
                    },
                    {
                      value: TransactionType.transfer,
                      label: t('transactions.transfer'),
                    },
                  ]}
                  value={field.value || []}
                  onChange={(value) =>
                    field.onChange(value as TransactionType[])
                  }
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
            <ZodFormController
              control={control}
              name="accountIds"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('transactions.accountPlaceholder')}
                  error={error}
                  data={accountOptions}
                  value={field.value || []}
                  onChange={field.onChange}
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
            <ZodFormController
              control={control}
              name="categoryIds"
              render={({ field, fieldState: { error } }) => (
                <CategoryMultiSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder={t('transactions.categoryPlaceholder')}
                  error={error}
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
            <ZodFormController
              control={control}
              name="entityIds"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('transactions.entityPlaceholder', {
                    defaultValue: 'Select entities',
                  })}
                  error={error}
                  data={entityOptions}
                  value={field.value || []}
                  onChange={field.onChange}
                  searchable
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
          </Group>
        </FormComponent>
      }
      buttonGroups={
        <Button onClick={handleAdd} disabled={isSubmitting}>
          {t('transactions.addTransaction')}
        </Button>
      }
      onReset={() => reset(defaultFilterValues)}
      stats={stats}
    >
      <TransactionTable
        transactions={data?.transactions || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        recordsPerPage={limit}
        recordsPerPageOptions={[10, 20, 50, 100]}
        onRecordsPerPageChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        page={page}
        onPageChange={setPage}
        totalRecords={data?.pagination?.total}
        sorting={
          sortBy
            ? [
                {
                  id: sortBy,
                  desc: sortOrder === 'desc',
                },
              ]
            : undefined
        }
        onSortingChange={(
          updater:
            | { id: string; desc: boolean }[]
            | ((prev: { id: string; desc: boolean }[]) => {
                id: string;
                desc: boolean;
              }[]),
        ) => {
          const newSorting =
            typeof updater === 'function'
              ? updater(
                  sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : [],
                )
              : updater;
          if (newSorting.length > 0) {
            setSortBy(
              newSorting[0].id as 'date' | 'amount' | 'type' | 'accountId',
            );
            setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
          } else {
            setSortBy('date');
            setSortOrder('desc');
          }
          setPage(1);
        }}
      />

      {isDialogOpen && (
        <AddEditTransactionDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          transaction={selectedTransaction}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
          accounts={accounts}
          categories={categories}
          entities={entities}
        />
      )}

      {isDeleteDialogOpen && transactionToDelete && (
        <Modal
          opened={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          title={t('transactions.deleteConfirmTitle')}
          size="md"
        >
          <Text mb="md">
            {t('transactions.deleteConfirmMessage')}
            <br />
            <strong>
              {transactionToDelete.amount}{' '}
              {transactionToDelete.account.currency.symbol}
            </strong>
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={handleDeleteDialogClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t('common.deleting', { defaultValue: 'Deleting...' })
                : t('common.delete')}
            </Button>
          </Group>
        </Modal>
      )}
    </PageContainer>
  );
};

export default TransactionPage;
