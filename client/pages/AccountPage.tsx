import AccountTable from '@client/components/AccountTable';
import AddEditAccountDialog from '@client/components/AddEditAccountDialog';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { TextInput } from '@client/components/TextInput';
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
import { useZodForm } from '@client/hooks/useZodForm';
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberFormatter,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import {
  type AccountResponse,
  type IUpsertAccountDto,
  ListAccountsQueryDto,
} from '@server/dto/account.dto';
import { AccountType } from '@server/generated/prisma/enums';
import { useMemo, useRef, useState } from 'react';
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
  const [selectedAccount, setSelectedAccount] =
    useState<AccountResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] =
    useState<AccountResponse | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'balance'>(
    'createdAt',
  );
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

  const { data, isLoading } = useAccountsQuery(
    queryParams,
    formRef,
    handleSubmit,
  );
  const { data: currencies = [] } = useCurrenciesQuery();
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation();
  const deleteMutation = useDeleteAccountMutation();

  const handleAdd = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (account: AccountResponse) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = (account: AccountResponse) => {
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

  const handleSubmitForm = async (formData: IUpsertAccountDto) => {
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
        <FormComponent ref={formRef}>
          <Group>
            <ZodFormController
              control={control}
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
              control={control}
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
              control={control}
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
        <Button onClick={handleAdd} disabled={isSubmitting}>
          {t('accounts.addAccount')}
        </Button>
      }
      onReset={() => reset(defaultFilterValues)}
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
          onSubmit={handleSubmitForm}
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
