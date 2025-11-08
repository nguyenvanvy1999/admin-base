import AccountTable from '@client/components/AccountTable';
import AddEditAccountDialog from '@client/components/AddEditAccountDialog';
import Pagination from '@client/components/Pagination';
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from '@client/hooks/mutations/useAccountMutations';
import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
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
  expiryDate: string | null;
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
  const limit = 20;

  const queryParams = useMemo(
    () => ({
      type: typeFilter || undefined,
      page,
      limit,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    }),
    [typeFilter, page, limit],
  );

  const { data, isLoading } = useAccountsQuery(queryParams);
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation();
  const deleteMutation = useDeleteAccountMutation();

  const filteredAccounts = useMemo(() => {
    if (!data?.accounts) return [];
    let accounts = data.accounts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      accounts = accounts.filter((account) =>
        account.name.toLowerCase().includes(query),
      );
    }

    return accounts;
  }, [data?.accounts, searchQuery]);

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
    expiryDate?: string;
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

  const handleTypeFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTypeFilter(e.target.value);
      setPage(1);
    },
    [],
  );

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
            <button
              onClick={handleAdd}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('accounts.addAccount')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t('accounts.search')}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="md:col-span-4">
              <select
                value={typeFilter}
                onChange={handleTypeFilterChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">{t('accounts.all')}</option>
                <option value={AccountType.cash}>{t('accounts.cash')}</option>
                <option value={AccountType.bank}>{t('accounts.bank')}</option>
                <option value={AccountType.credit_card}>
                  {t('accounts.credit_card')}
                </option>
                <option value={AccountType.investment}>
                  {t('accounts.investment')}
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden">
            <AccountTable
              accounts={filteredAccounts}
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
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={handleDeleteDialogClose}
              ></div>

              <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {t('accounts.deleteConfirmTitle')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('accounts.deleteConfirmMessage')}
                  <br />
                  <strong className="text-gray-900 dark:text-gray-100">
                    {accountToDelete.name}
                  </strong>
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDeleteDialogClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? t('common.deleting', { defaultValue: 'Deleting...' })
                      : t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
