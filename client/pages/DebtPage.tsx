import AddEditTransactionDialog from '@client/components/AddEditTransactionDialog';
import CategoryMultiSelect from '@client/components/CategoryMultiSelect';
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
import { useZodForm } from '@client/hooks/useZodForm';
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  Text,
  TextInput,
} from '@mantine/core';
import type {
  IUpsertTransaction,
  TransactionDetail,
} from '@server/dto/transaction.dto';
import { ListTransactionsQueryDto } from '@server/dto/transaction.dto';
import { TransactionType } from '@server/generated/browser-index';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListTransactionsQueryDto.pick({
  types: true,
  accountIds: true,
  categoryIds: true,
  entityIds: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
  types: [TransactionType.loan_given, TransactionType.loan_received],
  accountIds: [],
  categoryIds: [],
  entityIds: [],
};

const DebtPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionDetail | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionDetail | null>(null);
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

  const { data, isLoading, refetch } = useTransactionsQuery(
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

  const handleEdit = (transaction: TransactionDetail) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleDelete = (transaction: TransactionDetail) => {
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
    formData: IUpsertTransaction,
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

  const handleSearch = () => {
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
      onSearch={handleSearch}
      onReset={() => {
        reset(defaultFilterValues);
        refetch();
      }}
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

export default DebtPage;
