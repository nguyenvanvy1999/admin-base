import AccountTable from '@client/components/AccountTable';
import AddEditAccountDialog from '@client/components/AddEditAccountDialog';
import { PageContainer } from '@client/components/PageContainer';
import { TextInput } from '@client/components/TextInput';
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from '@client/hooks/mutations/useAccountMutations';
import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import type { AccountFormData, AccountFull } from '@client/types/account';
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberFormatter,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { AccountType } from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AccountPage = () => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedAccount, setSelectedAccount] = useState<AccountFull | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AccountFull | null>(
    null,
  );
  const [typeFilterInput, setTypeFilterInput] = useState<AccountType[]>([]);
  const [typeFilter, setTypeFilter] = useState<AccountType[]>([]);
  const [currencyFilterInput, setCurrencyFilterInput] = useState<string[]>([]);
  const [currencyFilter, setCurrencyFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'balance'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const queryParams = useMemo(
    () => ({
      type: typeFilter.length > 0 ? typeFilter : undefined,
      currencyId: currencyFilter.length > 0 ? currencyFilter : undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [typeFilter, currencyFilter, searchQuery, page, limit, sortBy, sortOrder],
  );

  const { data, isLoading } = useAccountsQuery(queryParams);
  const { data: currencies = [] } = useCurrenciesQuery();
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
    return (
      searchQuery.trim() !== '' ||
      typeFilter.length > 0 ||
      currencyFilter.length > 0
    );
  }, [searchQuery, typeFilter, currencyFilter]);

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const statistics = data?.summary || [];

  const stats = useMemo(() => {
    if (!statistics || statistics.length === 0) return undefined;
    return statistics.map((item) => {
      const isNegative = item.totalBalance < 0;
      const color = isNegative
        ? isDark
          ? 'rgb(248 113 113)'
          : 'rgb(185 28 28)'
        : isDark
          ? 'rgb(34 197 94)'
          : 'rgb(21 128 61)';
      return {
        titleI18nKey: 'accounts.totalAssets' as const,
        value: (
          <NumberFormatter
            value={item.totalBalance}
            prefix={item.currency.symbol ? `${item.currency.symbol} ` : ''}
            thousandSeparator=","
            decimalScale={2}
            allowNegative={true}
          />
        ),
        color,
      };
    });
  }, [statistics, isDark]);

  return (
    <PageContainer
      filterGroup={
        <>
          <TextInput
            placeholder={t('accounts.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setTypeFilter(typeFilterInput);
                setCurrencyFilter(currencyFilterInput);
                setPage(1);
              }
            }}
            style={{ flex: 1, maxWidth: '300px' }}
          />
          <MultiSelect
            value={typeFilterInput}
            onChange={(value) => setTypeFilterInput(value as AccountType[])}
            placeholder={t('accounts.typePlaceholder')}
            data={[
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
            style={{ maxWidth: '200px' }}
          />
          <MultiSelect
            value={currencyFilterInput}
            onChange={(value) => setCurrencyFilterInput(value)}
            placeholder={t('accounts.currencyPlaceholder', {
              defaultValue: 'Currency',
            })}
            data={currencies.map((currency) => ({
              value: currency.id,
              label: `${currency.code} - ${currency.name}`,
            }))}
            style={{ maxWidth: '200px' }}
          />
        </>
      }
      buttonGroups={
        <Button onClick={handleAdd} disabled={isSubmitting}>
          {t('accounts.addAccount')}
        </Button>
      }
      onReset={
        hasActiveFilters
          ? () => {
              setSearchQuery('');
              setTypeFilterInput([]);
              setTypeFilter([]);
              setCurrencyFilterInput([]);
              setCurrencyFilter([]);
              setPage(1);
            }
          : undefined
      }
      stats={stats}
    >
      <AccountTable
        accounts={data?.accounts || []}
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
        onSortingChange={(updater) => {
          const newSorting =
            typeof updater === 'function'
              ? updater(
                  sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : [],
                )
              : updater;
          if (newSorting.length > 0) {
            setSortBy(newSorting[0].id as 'name' | 'createdAt' | 'balance');
            setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
          } else {
            setSortBy('createdAt');
            setSortOrder('desc');
          }
          setPage(1);
        }}
      />

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
    </PageContainer>
  );
};

export default AccountPage;
