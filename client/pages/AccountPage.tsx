import AccountTable from '@client/components/AccountTable';
import AddEditAccountDialog from '@client/components/AddEditAccountDialog';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from '@client/hooks/mutations/useAccountMutations';
import {
  type FilterFormValue,
  useAccountsQuery,
} from '@client/hooks/queries/useAccountQueries';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
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
import {
  type AccountResponse,
  type AccountSummary,
  type IUpsertAccountDto,
  ListAccountsQueryDto,
} from '@server/dto/account.dto';
import { AccountType } from '@server/generated/browser-index';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListAccountsQueryDto.pick({
  search: true,
  type: true,
  currencyId: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
  type: [],
  currencyId: [],
};

const AccountPage = () => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const formRef = useRef<FormComponentRef>(null);

  const paginationSorting = usePaginationSorting<
    'name' | 'createdAt' | 'balance'
  >({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const dialog = usePageDialog<AccountResponse>();

  const deleteHandler = usePageDelete<AccountResponse>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useAccountsQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const { data: currencies = [] } = useCurrenciesQuery();
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation();
  const deleteMutation = useDeleteAccountMutation();

  const handleSubmitForm = async (formData: IUpsertAccountDto) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
      dialog.handleClose();
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    await deleteHandler.handleConfirmDelete(deleteMutation.mutateAsync);
  };

  const handleSearch = () => {
    refetch();
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const statistics = data?.summary || [];

  const stats = useMemo(() => {
    if (!statistics || statistics.length === 0) return undefined;
    return statistics.map((item: AccountSummary) => {
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
        <FormComponent ref={formRef}>
          <Group>
            <ZodFormController
              control={form.control}
              name="search"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  placeholder={t('accounts.search')}
                  error={error}
                  style={{ flex: 1, maxWidth: '300px' }}
                  {...field}
                />
              )}
            />
            <ZodFormController
              control={form.control}
              name="type"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('accounts.typePlaceholder')}
                  error={error}
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
                  value={field.value || []}
                  onChange={(value) => field.onChange(value as AccountType[])}
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
            <ZodFormController
              control={form.control}
              name="currencyId"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('accounts.currencyPlaceholder', {
                    defaultValue: 'Currency',
                  })}
                  error={error}
                  data={currencies.map((currency) => ({
                    value: currency.id,
                    label: `${currency.code} - ${currency.name}`,
                  }))}
                  value={field.value || []}
                  onChange={field.onChange}
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
          </Group>
        </FormComponent>
      }
      buttonGroups={
        <Button onClick={dialog.handleAdd} disabled={isSubmitting}>
          {t('accounts.addAccount')}
        </Button>
      }
      onSearch={handleSearch}
      onReset={() => {
        form.reset(defaultFilterValues);
        refetch();
      }}
      stats={stats}
    >
      <AccountTable
        accounts={data?.accounts || []}
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
          paginationSorting.setSorting(updater, 'createdAt')
        }
      />

      {dialog.isDialogOpen && (
        <AddEditAccountDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          account={dialog.selectedItem}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
        />
      )}

      {deleteHandler.isDeleteDialogOpen && deleteHandler.itemToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteHandler.isDeleteDialogOpen}
          onClose={deleteHandler.handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('accounts.deleteConfirmTitle')}
          message={t('accounts.deleteConfirmMessage')}
          itemName={deleteHandler.itemToDelete.name}
        />
      )}
    </PageContainer>
  );
};

export default AccountPage;
