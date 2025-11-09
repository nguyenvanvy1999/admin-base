import AddEditTransactionDialog from '@client/components/AddEditTransactionDialog';
import CategoryMultiSelect from '@client/components/CategoryMultiSelect';
import TransactionTable from '@client/components/TransactionTable';
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useUpdateTransactionMutation,
} from '@client/hooks/mutations/useTransactionMutations';
import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
import { useEntitiesQuery } from '@client/hooks/queries/useEntityQueries';
import { useTransactionsQuery } from '@client/hooks/queries/useTransactionQueries';
import type {
  TransactionFormData,
  TransactionFull,
} from '@client/types/transaction';
import { Button, Group, Modal, MultiSelect, Text } from '@mantine/core';
import { TransactionType } from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const TransactionPage = () => {
  const { t } = useTranslation();
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionFull | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionFull | null>(null);
  const [typeFilterInput, setTypeFilterInput] = useState<TransactionType[]>([]);
  const [typeFilterIds, setTypeFilterIds] = useState<TransactionType[]>([]);
  const [accountFilterInput, setAccountFilterInput] = useState<string[]>([]);
  const [accountFilterIds, setAccountFilterIds] = useState<string[]>([]);
  const [categoryFilterInput, setCategoryFilterInput] = useState<string[]>([]);
  const [categoryFilterIds, setCategoryFilterIds] = useState<string[]>([]);
  const [entityFilterInput, setEntityFilterInput] = useState<string[]>([]);
  const [entityFilterIds, setEntityFilterIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const queryParams = useMemo(
    () => ({
      types: typeFilterIds.length > 0 ? typeFilterIds : undefined,
      accountIds: accountFilterIds.length > 0 ? accountFilterIds : undefined,
      categoryIds: categoryFilterIds.length > 0 ? categoryFilterIds : undefined,
      entityIds: entityFilterIds.length > 0 ? entityFilterIds : undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [
      typeFilterIds,
      accountFilterIds,
      categoryFilterIds,
      entityFilterIds,
      searchQuery,
      page,
      limit,
      sortBy,
      sortOrder,
    ],
  );

  const { data, isLoading } = useTransactionsQuery(queryParams);
  const { data: accountsData } = useAccountsQuery({});
  const { data: entitiesData } = useEntitiesQuery({});

  const accounts = accountsData?.accounts || [];
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

  const handleSubmit = async (
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

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      typeFilterIds.length > 0 ||
      accountFilterIds.length > 0 ||
      categoryFilterIds.length > 0 ||
      entityFilterIds.length > 0
    );
  }, [
    searchQuery,
    typeFilterIds,
    accountFilterIds,
    categoryFilterIds,
    entityFilterIds,
  ]);

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
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('transactions.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('transactions.subtitle')}
              </p>
            </div>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {t('transactions.addTransaction')}
            </Button>
          </div>

          <TransactionTable
            transactions={data?.transactions || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
            search={{
              onSearch: (searchValue: string) => {
                setSearchQuery(searchValue);
                setTypeFilterIds(typeFilterInput);
                setAccountFilterIds(accountFilterInput);
                setCategoryFilterIds(categoryFilterInput);
                setEntityFilterIds(entityFilterInput);
                setPage(1);
              },
              placeholder: t('transactions.search'),
            }}
            pageSize={{
              initialSize: limit,
              onPageSizeChange: (size: number) => {
                setLimit(size);
                setPage(1);
              },
            }}
            filters={{
              hasActive: hasActiveFilters,
              onReset: () => {
                setSearchQuery('');
                setTypeFilterInput([]);
                setTypeFilterIds([]);
                setAccountFilterInput([]);
                setAccountFilterIds([]);
                setCategoryFilterInput([]);
                setCategoryFilterIds([]);
                setEntityFilterInput([]);
                setEntityFilterIds([]);
                setPage(1);
              },
              slots: [
                <MultiSelect
                  key="type-filter"
                  value={typeFilterInput}
                  onChange={(value) => {
                    setTypeFilterInput(value as TransactionType[]);
                    setTypeFilterIds(value as TransactionType[]);
                  }}
                  placeholder={t('transactions.typePlaceholder')}
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
                />,
                <MultiSelect
                  key="account-filter"
                  value={accountFilterInput}
                  onChange={(value) => {
                    setAccountFilterInput(value);
                    setAccountFilterIds(value);
                  }}
                  placeholder={t('transactions.accountPlaceholder')}
                  data={accountOptions}
                />,
                <CategoryMultiSelect
                  key="category-filter"
                  value={categoryFilterInput}
                  onChange={(value) => {
                    setCategoryFilterInput(value);
                    setCategoryFilterIds(value);
                  }}
                  placeholder={t('transactions.categoryPlaceholder')}
                />,
                <MultiSelect
                  key="entity-filter"
                  value={entityFilterInput}
                  onChange={(value) => {
                    setEntityFilterInput(value);
                    setEntityFilterIds(value);
                  }}
                  placeholder={t('transactions.entityPlaceholder', {
                    defaultValue: 'Select entities',
                  })}
                  data={entityOptions}
                  searchable
                />,
              ],
            }}
            pagination={
              data?.pagination && data.pagination.totalPages > 0
                ? {
                    currentPage: page,
                    totalPages: data.pagination.totalPages,
                    totalItems: data.pagination.total,
                    itemsPerPage: limit,
                    onPageChange: setPage,
                  }
                : undefined
            }
            sorting={{
              sortBy,
              sortOrder,
              onSortChange: (
                newSortBy: string,
                newSortOrder: 'asc' | 'desc',
              ) => {
                setSortBy(newSortBy as 'date' | 'amount');
                setSortOrder(newSortOrder);
                setPage(1);
              },
            }}
          />
        </div>

        {isDialogOpen && (
          <AddEditTransactionDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            transaction={selectedTransaction}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
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
      </div>
    </div>
  );
};

export default TransactionPage;
