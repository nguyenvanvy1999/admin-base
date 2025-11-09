import AccountTable from '@client/components/AccountTable';
import AddEditAccountDialog from '@client/components/AddEditAccountDialog';
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from '@client/hooks/mutations/useAccountMutations';
import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
import type { AccountFormData, AccountFull } from '@client/types/account';
import { Button, Group, Modal, Select, Text } from '@mantine/core';
import { AccountType } from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AccountPage = () => {
  const { t } = useTranslation();
  const [selectedAccount, setSelectedAccount] = useState<AccountFull | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AccountFull | null>(
    null,
  );
  const [typeFilterInput, setTypeFilterInput] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryParams = useMemo(
    () => ({
      type: typeFilter || undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    }),
    [typeFilter, searchQuery, page, limit],
  );

  const { data, isLoading, refetch } = useAccountsQuery(queryParams);
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation();
  const deleteMutation = useDeleteAccountMutation();

  const handleAdd = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (account: AccountFull) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = (account: AccountFull) => {
    setAccountToDelete(account);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAccount(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const handleSubmit = async (formData: AccountFormData) => {
    if (formData.id) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
    }
    handleDialogClose();
  };

  const handleConfirmDelete = async () => {
    if (accountToDelete) {
      await deleteMutation.mutateAsync(accountToDelete.id);
      handleDeleteDialogClose();
    }
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || typeFilter !== '';
  }, [searchQuery, typeFilter]);

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('accounts.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('accounts.subtitle')}
              </p>
            </div>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {t('accounts.addAccount')}
            </Button>
          </div>

          <AccountTable
            accounts={data?.accounts || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
            search={{
              onSearch: (searchValue: string) => {
                setSearchQuery(searchValue);
                setTypeFilter(typeFilterInput);
                setPage(1);
                refetch();
              },
              placeholder: t('accounts.search'),
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
                setTypeFilterInput('');
                setTypeFilter('');
                setPage(1);
                refetch();
              },
              slots: [
                <Select
                  key="type-filter"
                  value={typeFilterInput || null}
                  onChange={(value: string | null) => {
                    setTypeFilterInput(value || '');
                  }}
                  placeholder={t('accounts.typePlaceholder')}
                  data={[
                    { value: '', label: t('accounts.all') },
                    { value: AccountType.cash, label: t('accounts.cash') },
                    { value: AccountType.bank, label: t('accounts.bank') },
                    {
                      value: AccountType.credit_card,
                      label: t('accounts.credit_card'),
                    },
                    {
                      value: AccountType.investment,
                      label: t('accounts.investment'),
                    },
                  ]}
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
          />
        </div>

        {isDialogOpen && (
          <AddEditAccountDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            account={selectedAccount}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        )}

        {isDeleteDialogOpen && accountToDelete && (
          <Modal
            opened={isDeleteDialogOpen}
            onClose={handleDeleteDialogClose}
            title={t('accounts.deleteConfirmTitle')}
            size="md"
          >
            <Text mb="md">
              {t('accounts.deleteConfirmMessage')}
              <br />
              <strong>{accountToDelete.name}</strong>
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

export default AccountPage;
