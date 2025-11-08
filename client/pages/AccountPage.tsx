import AccountTable from '@client/components/AccountTable';
import AddEditAccountDialog from '@client/components/AddEditAccountDialog';
import Pagination from '@client/components/Pagination';
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from '@client/hooks/mutations/useAccountMutations';
import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
import { Button, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import { AccountType } from '@server/generated/prisma/enums';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Account = {
  id: string;
  type: string;
  name: string;
  currencyId: string;
  balance: string;
  creditLimit: string | null;
  notifyOnDueDate: boolean | null;
  paymentDay: number | null;
  notifyDaysBefore: number | null;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
  };
};

const AccountPage = () => {
  const { t } = useTranslation();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
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

  const { data, isLoading } = useAccountsQuery(queryParams);
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation();
  const deleteMutation = useDeleteAccountMutation();

  const handleAdd = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = (account: Account) => {
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

  const handleSubmit = async (formData: {
    id?: string;
    type: string;
    name: string;
    currencyId: string;
    creditLimit?: number;
    notifyOnDueDate?: boolean;
    paymentDay?: number;
    notifyDaysBefore?: number;
  }) => {
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

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPage(1);
    },
    [],
  );

  const handleTypeFilterChange = useCallback((value: string | null) => {
    setTypeFilter(value || '');
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value: string | null) => {
    const newLimit = value ? parseInt(value, 10) : 20;
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('');
    setPage(1);
  }, []);

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

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-64">
              <TextInput
                value={searchQuery}
                onChange={(e) =>
                  handleSearchChange(e as React.ChangeEvent<HTMLInputElement>)
                }
                placeholder={t('accounts.search')}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={typeFilter || null}
                onChange={handleTypeFilterChange}
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
              />
            </div>
            <div className="w-full md:w-32">
              <Select
                value={limit.toString()}
                onChange={handlePageSizeChange}
                placeholder={t('accounts.pageSizeLabel')}
                data={[
                  { value: '10', label: '10' },
                  { value: '20', label: '20' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                ]}
              />
            </div>
            {hasActiveFilters && (
              <div className="w-full md:w-auto">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  disabled={isLoading}
                >
                  {t('accounts.clearFilters')}
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <AccountTable
              accounts={data?.accounts || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>

          {data?.pagination && data.pagination.totalPages > 0 && (
            <Pagination
              currentPage={page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.total}
              itemsPerPage={limit}
              onPageChange={setPage}
              isLoading={isLoading}
            />
          )}
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
