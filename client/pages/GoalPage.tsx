import AddEditGoalDialog from '@client/components/dialogs/AddEditGoalDialog';
import { DeleteConfirmationModal } from '@client/components/dialogs/DeleteConfirmationModal';
import { DeleteManyConfirmationModal } from '@client/components/dialogs/DeleteManyConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import GoalTable from '@client/components/tables/GoalTable';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateGoalMutation,
  useDeleteManyGoalsMutation,
  useUpdateGoalMutation,
} from '@client/hooks/mutations/useGoalMutations';
import {
  type FilterFormValue,
  useGoalsQuery,
} from '@client/hooks/queries/useGoalQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, TextInput } from '@mantine/core';
import type { GoalResponse, IUpsertGoalDto } from '@server/dto/goal.dto';
import { ListGoalsQueryDto } from '@server/dto/goal.dto';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListGoalsQueryDto.pick({
  search: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
};

const GoalPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);

  const paginationSorting = usePaginationSorting<
    'name' | 'amount' | 'startDate' | 'endDate' | 'created'
  >({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'created',
    defaultSortOrder: 'desc',
  });

  const dialog = usePageDialog<GoalResponse>();
  const deleteHandler = usePageDelete<GoalResponse>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useGoalsQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const createMutation = useCreateGoalMutation();
  const updateMutation = useUpdateGoalMutation();
  const deleteManyMutation = useDeleteManyGoalsMutation();

  const handleSubmitForm = async (
    formData: IUpsertGoalDto,
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
      /* handled by mutation */
    }
  };

  const handleConfirmDelete = async () => {
    await deleteHandler.handleConfirmDeleteMany(deleteManyMutation.mutateAsync);
  };

  const handleConfirmDeleteMany = async () => {
    await deleteHandler.handleConfirmDeleteMany(deleteManyMutation.mutateAsync);
  };

  const handleSearch = () => {
    refetch();
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
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
                    placeholder={t('goals.search')}
                    error={error}
                    style={{ flex: 1 }}
                    w={{ base: '100%', sm: 300 }}
                    {...field}
                  />
                )}
              />
            </Group>
          </FormComponent>
        }
        buttonGroups={
          <Button onClick={dialog.handleAdd} disabled={isSubmitting}>
            {t('goals.addGoal')}
          </Button>
        }
        onSearch={handleSearch}
        onReset={() => {
          form.reset(defaultFilterValues);
          refetch();
        }}
      >
        <GoalTable
          goals={data?.goals || []}
          onEdit={dialog.handleEdit}
          onDelete={deleteHandler.handleDelete}
          onDeleteMany={deleteHandler.handleDeleteMany}
          isLoading={isLoading}
          recordsPerPage={paginationSorting.limit}
          recordsPerPageOptions={[10, 20, 50, 100]}
          onRecordsPerPageChange={paginationSorting.setLimit}
          page={paginationSorting.page}
          onPageChange={paginationSorting.setPage}
          totalRecords={data?.pagination?.total}
          sorting={paginationSorting.sorting}
          onSortingChange={(updater) =>
            paginationSorting.setSorting(updater, 'created')
          }
          selectedRecords={deleteHandler.selectedRecords}
          onSelectedRecordsChange={deleteHandler.setSelectedRecords}
        />
      </PageContainer>

      {dialog.isDialogOpen && (
        <AddEditGoalDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          goal={dialog.selectedItem}
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
          title={t('goals.deleteConfirmTitle')}
          message={t('goals.deleteConfirmMessage')}
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
            title={t('goals.deleteManyConfirmTitle')}
            message={t('goals.deleteManyConfirmMessage')}
            count={deleteHandler.itemsToDeleteMany.length}
          />
        )}
    </>
  );
};

export default GoalPage;
