import AddEditTransactionDialog from '@client/components/AddEditTransactionDialog';
import CategoryMultiSelect from '@client/components/CategoryMultiSelect';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
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
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { useZodForm } from '@client/hooks/useZodForm';
import {
  Button,
  Group,
  MultiSelect,
  NumberFormatter,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import type {
  IUpsertTransaction,
  TransactionDetail,
} from '@server/dto/transaction.dto';
import { ListTransactionsQueryDto } from '@server/dto/transaction.dto';
import { TransactionType } from '@server/generated';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListTransactionsQueryDto.pick({
  types: true,
  accountIds: true,
  categoryIds: true,
  entityIds: true,
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

  const paginationSorting = usePaginationSorting<
    'date' | 'amount' | 'type' | 'accountId'
  >({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'date',
    defaultSortOrder: 'desc',
  });

  const dialog = usePageDialog<TransactionDetail>();

  const deleteHandler = usePageDelete<TransactionDetail>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useTransactionsQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
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

  const handleSubmitForm = async (
    formData: IUpsertTransaction,
    saveAndAdd: boolean,
  ) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
      if (!saveAndAdd) {
        dialog.handleClose();
      }
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    await deleteHandler.handleConfirmDelete((ids: string[]) =>
      deleteMutation.mutateAsync(ids[0]),
    );
  };

  const handleSearch = () => {
    refetch();
  };

  const handleReset = () => {
    form.reset(defaultFilterValues);
    refetch();
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
              control={form.control}
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
              control={form.control}
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
                    {
                      value: TransactionType.loan_given,
                      label: t('transactions.loanGiven', {
                        defaultValue: 'Loan Given',
                      }),
                    },
                    {
                      value: TransactionType.loan_received,
                      label: t('transactions.loanReceived', {
                        defaultValue: 'Loan Received',
                      }),
                    },
                    {
                      value: TransactionType.repay_debt,
                      label: t('categories.repay_debt', {
                        defaultValue: 'Repay Debt',
                      }),
                    },
                    {
                      value: TransactionType.collect_debt,
                      label: t('categories.collect_debt', {
                        defaultValue: 'Collect Debt',
                      }),
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
        <Button onClick={dialog.handleAdd} disabled={isSubmitting}>
          {t('transactions.addTransaction')}
        </Button>
      }
      onSearch={handleSearch}
      onReset={handleReset}
      stats={stats}
    >
      <TransactionTable
        transactions={data?.transactions || []}
        onEdit={dialog.handleEdit}
        onDelete={deleteHandler.handleDelete}
        isLoading={isLoading}
        recordsPerPage={paginationSorting.limit}
        recordsPerPageOptions={[10, 20, 50, 100]}
        onRecordsPerPageChange={paginationSorting.setLimit}
        page={paginationSorting.page}
        onPageChange={paginationSorting.setPage}
        totalRecords={data?.pagination?.total}
        sorting={paginationSorting.sorting}
        onSortingChange={(updater) =>
          paginationSorting.setSorting(updater, 'date')
        }
      />

      {dialog.isDialogOpen && (
        <AddEditTransactionDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          transaction={dialog.selectedItem}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
          accounts={accounts}
          categories={categories}
          entities={entities}
        />
      )}

      {deleteHandler.isDeleteDialogOpen && deleteHandler.itemToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteHandler.isDeleteDialogOpen}
          onClose={deleteHandler.handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('transactions.deleteConfirmTitle')}
          message={t('transactions.deleteConfirmMessage')}
          itemName={`${deleteHandler.itemToDelete.amount} ${deleteHandler.itemToDelete.account.currency.symbol}`}
        />
      )}
    </PageContainer>
  );
};

export default TransactionPage;
