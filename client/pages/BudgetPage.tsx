import AddEditBudgetDialog from '@client/components/AddEditBudgetDialog';
import BudgetPeriodDetail from '@client/components/BudgetPeriodDetail';
import BudgetPeriodList from '@client/components/BudgetPeriodList';
import BudgetTable from '@client/components/BudgetTable';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import { DeleteManyConfirmationModal } from '@client/components/DeleteManyConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateBudgetMutation,
  useDeleteBudgetMutation,
  useDeleteManyBudgetsMutation,
  useUpdateBudgetMutation,
} from '@client/hooks/mutations/useBudgetMutations';
import {
  type FilterFormValue,
  useBudgetPeriodDetailQuery,
  useBudgetPeriodsQuery,
  useBudgetsQuery,
} from '@client/hooks/queries/useBudgetQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, Modal, MultiSelect, TextInput } from '@mantine/core';
import type { BudgetResponse, IUpsertBudgetDto } from '@server/dto/budget.dto';
import { ListBudgetsQueryDto } from '@server/dto/budget.dto';
import { BudgetPeriod } from '@server/generated/prisma/enums';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListBudgetsQueryDto.pick({
  search: true,
  period: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
  period: [],
};

const BudgetPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetResponse | null>(
    null,
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showPeriodsModal, setShowPeriodsModal] = useState(false);
  const [showPeriodDetailModal, setShowPeriodDetailModal] = useState(false);

  const paginationSorting = usePaginationSorting<
    'name' | 'amount' | 'period' | 'startDate' | 'createdAt'
  >({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const dialog = usePageDialog<BudgetResponse>();
  const deleteHandler = usePageDelete<BudgetResponse>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useBudgetsQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const { data: periodsData, isLoading: periodsLoading } =
    useBudgetPeriodsQuery(selectedBudget?.id || '');

  const { data: periodDetailData } = useBudgetPeriodDetailQuery(
    selectedBudget?.id || '',
    selectedPeriodId || '',
  );

  const createMutation = useCreateBudgetMutation();
  const updateMutation = useUpdateBudgetMutation();
  const deleteMutation = useDeleteBudgetMutation();
  const deleteManyMutation = useDeleteManyBudgetsMutation();

  const handleSubmitForm = async (
    formData: IUpsertBudgetDto,
    saveAndAdd?: boolean,
  ) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
      if (saveAndAdd) {
        dialog.handleSaveAndAdd();
      } else {
        dialog.handleClose();
      }
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    await deleteHandler.handleConfirmDelete(deleteMutation.mutateAsync);
  };

  const handleConfirmDeleteMany = async () => {
    await deleteHandler.handleConfirmDeleteMany(deleteManyMutation.mutateAsync);
  };

  const handleSearch = () => {
    refetch();
  };

  const handleViewPeriods = (budget: BudgetResponse) => {
    setSelectedBudget(budget);
    setShowPeriodsModal(true);
  };

  const handlePeriodClick = (period: BudgetPeriodDetailResponse) => {
    setSelectedPeriodId(period.id);
    setShowPeriodDetailModal(true);
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    deleteManyMutation.isPending;

  return (
    <>
      <PageContainer
        filterGroup={
          <FormComponent ref={formRef}>
            <Group>
              <ZodFormController
                control={form.control}
                name="search"
                render={({ field, fieldState: { error } }) => (
                  <TextInput
                    placeholder={t('budgets.search')}
                    error={error}
                    style={{ flex: 1, maxWidth: '300px' }}
                    {...field}
                  />
                )}
              />
              <ZodFormController
                control={form.control}
                name="period"
                render={({ field, fieldState: { error } }) => (
                  <MultiSelect
                    placeholder={t('budgets.periodPlaceholder')}
                    error={error}
                    data={[
                      {
                        value: BudgetPeriod.daily,
                        label: t('budgets.period.daily', {
                          defaultValue: 'Daily',
                        }),
                      },
                      {
                        value: BudgetPeriod.monthly,
                        label: t('budgets.period.monthly', {
                          defaultValue: 'Monthly',
                        }),
                      },
                      {
                        value: BudgetPeriod.quarterly,
                        label: t('budgets.period.quarterly', {
                          defaultValue: 'Quarterly',
                        }),
                      },
                      {
                        value: BudgetPeriod.yearly,
                        label: t('budgets.period.yearly', {
                          defaultValue: 'Yearly',
                        }),
                      },
                      {
                        value: BudgetPeriod.none,
                        label: t('budgets.period.none', {
                          defaultValue: 'None',
                        }),
                      },
                    ]}
                    value={field.value || []}
                    onChange={(value) =>
                      field.onChange(value as BudgetPeriod[])
                    }
                    style={{ maxWidth: '200px' }}
                  />
                )}
              />
            </Group>
          </FormComponent>
        }
        buttonGroups={
          <Button onClick={dialog.handleAdd} disabled={isSubmitting}>
            {t('budgets.addBudget')}
          </Button>
        }
        onSearch={handleSearch}
        onReset={() => form.reset(defaultFilterValues)}
      >
        <BudgetTable
          budgets={data?.budgets || []}
          onEdit={dialog.handleEdit}
          onDelete={deleteHandler.handleDelete}
          onDeleteMany={deleteHandler.handleDeleteMany}
          onViewPeriods={handleViewPeriods}
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
          selectedRecords={deleteHandler.selectedRecords}
          onSelectedRecordsChange={deleteHandler.setSelectedRecords}
        />
      </PageContainer>

      {dialog.isDialogOpen && (
        <AddEditBudgetDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          budget={dialog.selectedItem}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
          resetTrigger={dialog.resetTrigger}
        />
      )}

      {deleteHandler.isDeleteDialogOpen && deleteHandler.itemToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteHandler.isDeleteDialogOpen}
          onClose={deleteHandler.handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('budgets.deleteConfirmTitle')}
          message={t('budgets.deleteConfirmMessage')}
          itemName={deleteHandler.itemToDelete.name}
        />
      )}

      {deleteHandler.isDeleteManyDialogOpen &&
        deleteHandler.itemsToDeleteMany.length > 0 && (
          <DeleteManyConfirmationModal
            isOpen={deleteHandler.isDeleteManyDialogOpen}
            onClose={deleteHandler.handleDeleteManyDialogClose}
            onConfirm={handleConfirmDeleteMany}
            isLoading={isSubmitting}
            title={t('budgets.deleteManyConfirmTitle')}
            message={t('budgets.deleteManyConfirmMessage')}
            count={deleteHandler.itemsToDeleteMany.length}
          />
        )}

      <Modal
        opened={showPeriodsModal}
        onClose={() => {
          setShowPeriodsModal(false);
          setSelectedBudget(null);
        }}
        title={t('budgets.periods', { defaultValue: 'Budget Periods' })}
        size="xl"
      >
        <BudgetPeriodList
          periods={periodsData?.periods || []}
          isLoading={periodsLoading}
          onPeriodClick={handlePeriodClick}
        />
      </Modal>

      <Modal
        opened={showPeriodDetailModal}
        onClose={() => {
          setShowPeriodDetailModal(false);
          setSelectedPeriodId(null);
        }}
        title={t('budgets.periodDetail', { defaultValue: 'Period Detail' })}
        size="md"
      >
        {periodDetailData && <BudgetPeriodDetail period={periodDetailData} />}
      </Modal>
    </>
  );
};

export default BudgetPage;
