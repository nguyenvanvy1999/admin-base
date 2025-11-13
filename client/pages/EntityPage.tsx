import AddEditEntityDialog from '@client/components/AddEditEntityDialog';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import { DeleteManyConfirmationModal } from '@client/components/DeleteManyConfirmationModal';
import EntityTable from '@client/components/EntityTable';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateEntityMutation,
  useDeleteEntityMutation,
  useDeleteManyEntitiesMutation,
  useUpdateEntityMutation,
} from '@client/hooks/mutations/useEntityMutations';
import {
  type FilterFormValue,
  useEntitiesQuery,
} from '@client/hooks/queries/useEntityQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, MultiSelect, TextInput } from '@mantine/core';
import {
  type EntityResponse,
  type IUpsertEntityDto,
  ListEntitiesQueryDto,
} from '@server/dto/entity.dto';
import { EntityType } from '@server/generated/prisma/enums';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListEntitiesQueryDto.pick({
  search: true,
  type: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
  type: [],
};

const EntityPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);

  const paginationSorting = usePaginationSorting<'name' | 'type' | 'createdAt'>(
    {
      defaultPage: 1,
      defaultLimit: 20,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    },
  );

  const dialog = usePageDialog<EntityResponse>();

  const deleteHandler = usePageDelete<EntityResponse>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useEntitiesQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const createMutation = useCreateEntityMutation();
  const updateMutation = useUpdateEntityMutation();
  const deleteMutation = useDeleteEntityMutation();
  const deleteManyMutation = useDeleteManyEntitiesMutation!();

  const handleSubmitForm = async (
    formData: IUpsertEntityDto,
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

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    deleteManyMutation.isPending;

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
                  placeholder={t('entities.search')}
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
                  placeholder={t('entities.typePlaceholder')}
                  error={error}
                  data={[
                    {
                      value: EntityType.individual,
                      label: t('entities.individual'),
                    },
                    {
                      value: EntityType.organization,
                      label: t('entities.organization'),
                    },
                  ]}
                  value={field.value || []}
                  onChange={(value) => field.onChange(value as EntityType[])}
                  style={{ maxWidth: '200px' }}
                />
              )}
            />
          </Group>
        </FormComponent>
      }
      buttonGroups={
        <Button onClick={dialog.handleAdd} disabled={isSubmitting}>
          {t('entities.addEntity')}
        </Button>
      }
      onSearch={handleSearch}
      onReset={() => {
        form.reset(defaultFilterValues);
        refetch();
      }}
    >
      <EntityTable
        entities={data?.entities || []}
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
          paginationSorting.setSorting(updater, 'createdAt')
        }
        selectedRecords={deleteHandler.selectedRecords}
        onSelectedRecordsChange={deleteHandler.setSelectedRecords}
      />

      {dialog.isDialogOpen && (
        <AddEditEntityDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          entity={dialog.selectedItem}
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
          title={t('entities.deleteConfirmTitle')}
          message={t('entities.deleteConfirmMessage')}
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
            title={t('entities.deleteManyConfirmTitle', {
              defaultValue: 'Delete Multiple Entities',
            })}
            message={t('entities.deleteManyConfirmMessage', {
              defaultValue:
                'Are you sure you want to delete {{count}} entity(ies)?',
            })}
            count={deleteHandler.itemsToDeleteMany.length}
          />
        )}
    </PageContainer>
  );
};

export default EntityPage;
