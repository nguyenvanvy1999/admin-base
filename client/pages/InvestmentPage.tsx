import AddEditInvestmentDialog from '@client/components/AddEditInvestmentDialog';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import InvestmentTable from '@client/components/InvestmentTable';
import { PageContainer } from '@client/components/PageContainer';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateInvestmentMutation,
  useDeleteInvestmentMutation,
  useUpdateInvestmentMutation,
} from '@client/hooks/mutations/useInvestmentMutations';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import {
  type FilterFormValue,
  useInvestmentsQuery,
} from '@client/hooks/queries/useInvestmentQueries';
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
  InvestmentResponse,
  IUpsertInvestmentDto,
} from '@server/dto/investment.dto';
import { ListInvestmentsQueryDto } from '@server/dto/investment.dto';
import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const filterSchema = ListInvestmentsQueryDto.pick({
  search: true,
  assetTypes: true,
  modes: true,
  currencyIds: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
  assetTypes: [],
  modes: [],
  currencyIds: [],
};

const InvestmentPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<FormComponentRef>(null);
  const [selectedInvestment, setSelectedInvestment] =
    useState<InvestmentResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] =
    useState<InvestmentResponse | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>(
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

  const { data, isLoading, refetch } = useInvestmentsQuery(
    queryParams,
    formRef,
    handleSubmit,
  );
  const { data: currencies = [] } = useCurrenciesQuery();
  const createMutation = useCreateInvestmentMutation();
  const updateMutation = useUpdateInvestmentMutation();
  const deleteMutation = useDeleteInvestmentMutation();

  const handleAdd = () => {
    setSelectedInvestment(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (investment: InvestmentResponse) => {
    setSelectedInvestment(investment);
    setIsDialogOpen(true);
  };

  const handleView = (investment: InvestmentResponse) => {
    navigate(`/investments/${investment.id}`);
  };

  const handleDelete = (investment: InvestmentResponse) => {
    setInvestmentToDelete(investment);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setInvestmentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (investmentToDelete) {
      try {
        await deleteMutation.mutateAsync(investmentToDelete.id);
        handleDeleteDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedInvestment(null);
  };

  const handleSubmitForm = async (formData: IUpsertInvestmentDto) => {
    if (formData.id) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
    }
    handleDialogClose();
  };

  const handleSearch = () => {
    refetch();
  };

  const handleReset = () => {
    reset(defaultFilterValues);
    refetch();
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    isLoading;

  const stats = useMemo(() => {
    if (!data?.pagination) return undefined;
    return [
      {
        titleI18nKey: 'investments.totalCount' as any,
        value: String(data.pagination.total),
        color: undefined,
      },
    ];
  }, [data?.pagination]);

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
                  placeholder={t('investments.search', {
                    defaultValue: 'Search investments',
                  })}
                  error={error}
                  style={{ flex: 1, maxWidth: '300px' }}
                  {...field}
                />
              )}
            />
            <ZodFormController
              control={control}
              name="assetTypes"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('investments.assetFilter', {
                    defaultValue: 'Asset type',
                  })}
                  error={error}
                  data={[
                    {
                      value: InvestmentAssetType.coin,
                      label: t('investments.asset.coin', {
                        defaultValue: 'Coin',
                      }),
                    },
                    {
                      value: InvestmentAssetType.ccq,
                      label: t('investments.asset.ccq', {
                        defaultValue: 'Mutual fund',
                      }),
                    },
                    {
                      value: InvestmentAssetType.custom,
                      label: t('investments.asset.custom', {
                        defaultValue: 'Custom',
                      }),
                    },
                  ]}
                  value={field.value || []}
                  onChange={(value) =>
                    field.onChange(value as InvestmentAssetType[])
                  }
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
            <ZodFormController
              control={control}
              name="modes"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('investments.modeFilter', {
                    defaultValue: 'Mode',
                  })}
                  error={error}
                  data={[
                    {
                      value: InvestmentMode.priced,
                      label: t('investments.modes.priced', {
                        defaultValue: 'Market priced',
                      }),
                    },
                    {
                      value: InvestmentMode.manual,
                      label: t('investments.modes.manual', {
                        defaultValue: 'Manual valuation',
                      }),
                    },
                  ]}
                  value={field.value || []}
                  onChange={(value) =>
                    field.onChange(value as InvestmentMode[])
                  }
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
            <ZodFormController
              control={control}
              name="currencyIds"
              render={({ field, fieldState: { error } }) => (
                <MultiSelect
                  placeholder={t('investments.currencyFilter', {
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
          {t('investments.addInvestment', {
            defaultValue: 'New investment',
          })}
        </Button>
      }
      onSearch={handleSearch}
      onReset={handleReset}
      stats={stats}
    >
      <InvestmentTable
        investments={data?.investments || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
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
            setSortBy(newSorting[0].id as 'name' | 'createdAt' | 'updatedAt');
            setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
          } else {
            setSortBy('createdAt');
            setSortOrder('desc');
          }
          setPage(1);
        }}
      />

      {isDialogOpen && (
        <AddEditInvestmentDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          investment={selectedInvestment}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
        />
      )}

      {isDeleteDialogOpen && investmentToDelete && (
        <Modal
          opened={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          title={t('investments.deleteConfirmTitle', {
            defaultValue: 'Delete Investment',
          })}
          size="md"
        >
          <Text mb="md">
            {t('investments.deleteConfirmMessage', {
              defaultValue: 'Are you sure you want to delete this investment?',
            })}
            <br />
            <strong>{investmentToDelete.name}</strong>
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={handleDeleteDialogClose}
              disabled={isSubmitting}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t('common.deleting', { defaultValue: 'Deleting...' })
                : t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </Group>
        </Modal>
      )}
    </PageContainer>
  );
};

export default InvestmentPage;
