import AddEditTagDialog from '@client/components/AddEditTagDialog';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import { DeleteManyConfirmationModal } from '@client/components/DeleteManyConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import TagTable from '@client/components/TagTable';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateTagMutation,
  useDeleteManyTagsMutation,
  useDeleteTagMutation,
  useUpdateTagMutation,
} from '@client/hooks/mutations/useTagMutations';
import {
  type FilterFormValue,
  useTagsQuery,
} from '@client/hooks/queries/useTagQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, TextInput } from '@mantine/core';
import {
  type IUpsertTagDto,
  ListTagsQueryDto,
  type TagResponse,
} from '@server/dto/tag.dto';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListTagsQueryDto.pick({ search: true });

const defaultFilterValues: FilterFormValue = {
  search: '',
};

const TagPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    isDialogOpen,
    selectedItem: selectedTag,
    resetTrigger,
    handleAdd,
    handleEdit,
    handleClose: handleDialogClose,
    handleSaveAndAdd,
  } = usePageDialog<TagResponse>();

  const {
    isDeleteDialogOpen,
    itemToDelete: tagToDelete,
    handleDelete,
    handleDeleteDialogClose,
    handleConfirmDelete: handleConfirmDeleteBase,
    isDeleteManyDialogOpen,
    itemsToDeleteMany: tagsToDeleteMany,
    selectedRecords,
    setSelectedRecords,
    handleDeleteMany,
    handleDeleteManyDialogClose,
    handleConfirmDeleteMany: handleConfirmDeleteManyBase,
  } = usePageDelete<TagResponse>();

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

  const { data, isLoading } = useTagsQuery(queryParams, formRef, handleSubmit);
  const createMutation = useCreateTagMutation();
  const updateMutation = useUpdateTagMutation();
  const deleteMutation = useDeleteTagMutation();
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
        handleSaveAndAdd();
      } else {
        handleDialogClose();
      }
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = () => {
    handleConfirmDeleteBase(deleteMutation.mutateAsync);
  };

  const handleConfirmDeleteMany = () => {
    handleConfirmDeleteManyBase(deleteManyMutation.mutateAsync);
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
              control={control}
              name="search"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  placeholder={t('tags.search')}
                  error={error}
                  style={{ flex: 1, maxWidth: '300px' }}
                  {...field}
                />
              )}
            />
          </Group>
        </FormComponent>
      }
      buttonGroups={
        <Button onClick={handleAdd} disabled={isSubmitting}>
          {t('tags.addTag')}
        </Button>
      }
      onReset={() => reset(defaultFilterValues)}
    >
      <TagTable
        tags={data?.tags || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDeleteMany={handleDeleteMany}
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
            setSortBy(newSorting[0].id as 'name' | 'createdAt');
            setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
          } else {
            setSortBy('createdAt');
            setSortOrder('desc');
          }
          setPage(1);
        }}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
      />

      {isDialogOpen && (
        <AddEditTagDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          tag={selectedTag}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
          resetTrigger={resetTrigger}
        />
      )}

      {isDeleteDialogOpen && tagToDelete && (
        <DeleteConfirmationModal
          isOpen={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('tags.deleteConfirmTitle')}
          message={t('tags.deleteConfirmMessage')}
          itemName={tagToDelete.name}
        />
      )}

      {isDeleteManyDialogOpen && tagsToDeleteMany.length > 0 && (
        <DeleteManyConfirmationModal
          isOpen={isDeleteManyDialogOpen}
          onClose={handleDeleteManyDialogClose}
          onConfirm={handleConfirmDeleteMany}
          isLoading={isSubmitting}
          title={t('tags.deleteManyConfirmTitle', {
            defaultValue: 'Delete Multiple Tags',
          })}
          message={t('tags.deleteManyConfirmMessage', {
            defaultValue: 'Are you sure you want to delete {{count}} tag(s)?',
          })}
          count={tagsToDeleteMany.length}
        />
      )}
    </PageContainer>
  );
};

export default TagPage;
