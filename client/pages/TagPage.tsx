import {
  FormComponent,
  type FormComponentRef,
  PageContainer,
  ZodFormController,
} from '@client/components';
import {
  DeleteConfirmationModal,
  DeleteManyConfirmationModal,
} from '@client/components/dialogs';
import AddEditTagDialog from '@client/components/dialogs/AddEditTagDialog';
import TagTable from '@client/components/tables/TagTable';
import {
  useCreateTagMutation,
  useDeleteManyTagsMutation,
  useUpdateTagMutation,
} from '@client/hooks/mutations/useTagMutations';
import {
  type FilterFormValue,
  useTagsQuery,
} from '@client/hooks/queries/useTagQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, TextInput } from '@mantine/core';
import {
  type IUpsertTagDto,
  ListTagsQueryDto,
  type TagResponse,
} from '@server/dto/tag.dto';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListTagsQueryDto.pick({ search: true });

const defaultFilterValues: FilterFormValue = {
  search: '',
};

const TagPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);

  const paginationSorting = usePaginationSorting<'name' | 'created'>({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'created',
    defaultSortOrder: 'desc',
  });

  const dialog = usePageDialog<TagResponse>();

  const deleteHandler = usePageDelete<TagResponse>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useTagsQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const createMutation = useCreateTagMutation();
  const updateMutation = useUpdateTagMutation();
  const deleteManyMutation = useDeleteManyTagsMutation();

  const handleSubmitForm = async (
    formData: IUpsertTagDto,
    saveAndAdd?: boolean,
  ) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(
          formData as IUpsertTagDto & { id: string },
        );
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
    await deleteHandler.handleConfirmDelete(deleteManyMutation.mutateAsync);
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
    <PageContainer
      filterGroup={
        <FormComponent ref={formRef}>
          <Group>
            <ZodFormController
              control={form.control}
              name="search"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  placeholder={t('tags.search')}
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
          {t('tags.addTag')}
        </Button>
      }
      onSearch={handleSearch}
      onReset={() => {
        form.reset(defaultFilterValues);
        refetch();
      }}
    >
      <TagTable
        tags={data?.tags || []}
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

      {dialog.isDialogOpen && (
        <AddEditTagDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          tag={dialog.selectedItem}
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
          title={t('tags.deleteConfirmTitle')}
          message={t('tags.deleteConfirmMessage')}
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
            title={t('tags.deleteManyConfirmTitle', {
              defaultValue: 'Delete Multiple Tags',
            })}
            message={t('tags.deleteManyConfirmMessage', {
              defaultValue: 'Are you sure you want to delete {{count}} tag(s)?',
            })}
            count={deleteHandler.itemsToDeleteMany.length}
          />
        )}
    </PageContainer>
  );
};

export default TagPage;
