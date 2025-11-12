import AddEditEntityDialog from '@client/components/AddEditEntityDialog';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import { DeleteManyConfirmationModal } from '@client/components/DeleteManyConfirmationModal';
import EntityTable from '@client/components/EntityTable';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { TextInput } from '@client/components/TextInput';
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
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, MultiSelect } from '@mantine/core';
import {
  type EntityResponse,
  type IUpsertEntityDto,
  ListEntitiesQueryDto,
} from '@server/dto/entity.dto';
import { EntityType } from '@server/generated/prisma/enums';
import { useMemo, useRef, useState } from 'react';
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'createdAt'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    isDialogOpen,
    selectedItem: selectedEntity,
    resetTrigger,
    handleAdd,
    handleEdit,
    handleClose: handleDialogClose,
    handleSaveAndAdd,
  } = usePageDialog<EntityResponse>();

  const {
    isDeleteDialogOpen,
    itemToDelete: entityToDelete,
    handleDelete,
    handleDeleteDialogClose,
    handleConfirmDelete: handleConfirmDeleteBase,
    isDeleteManyDialogOpen,
    itemsToDeleteMany: entitiesToDeleteMany,
    selectedRecords,
    setSelectedRecords,
    handleDeleteMany,
    handleDeleteManyDialogClose,
    handleConfirmDeleteMany: handleConfirmDeleteManyBase,
  } = usePageDelete<EntityResponse>();

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

  const { data, isLoading } = useEntitiesQuery(
    queryParams,
    formRef,
    handleSubmit,
  );
  const createMutation = useCreateEntityMutation();
  const updateMutation = useUpdateEntityMutation();
  const deleteMutation = useDeleteEntityMutation();
  const deleteManyMutation = useDeleteManyEntitiesMutation();

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
                  placeholder={t('entities.search')}
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
        <Button onClick={handleAdd} disabled={isSubmitting}>
          {t('entities.addEntity')}
        </Button>
      }
      onReset={() => reset(defaultFilterValues)}
    >
      <EntityTable
        entities={data?.entities || []}
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
        onSortingChange={(updater) => {
          const newSorting =
            typeof updater === 'function'
              ? updater(
                  sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : [],
                )
              : updater;
          if (newSorting.length > 0) {
            setSortBy(newSorting[0].id as 'name' | 'type' | 'createdAt');
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
        <AddEditEntityDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          entity={selectedEntity}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
          resetTrigger={resetTrigger}
        />
      )}

      {isDeleteDialogOpen && entityToDelete && (
        <DeleteConfirmationModal
          isOpen={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('entities.deleteConfirmTitle')}
          message={t('entities.deleteConfirmMessage')}
          itemName={entityToDelete.name}
        />
      )}

      {isDeleteManyDialogOpen && entitiesToDeleteMany.length > 0 && (
        <DeleteManyConfirmationModal
          isOpen={isDeleteManyDialogOpen}
          onClose={handleDeleteManyDialogClose}
          onConfirm={handleConfirmDeleteMany}
          isLoading={isSubmitting}
          title={t('entities.deleteManyConfirmTitle', {
            defaultValue: 'Delete Multiple Entities',
          })}
          message={t('entities.deleteManyConfirmMessage', {
            defaultValue:
              'Are you sure you want to delete {{count}} entity(ies)?',
          })}
          count={entitiesToDeleteMany.length}
        />
      )}
    </PageContainer>
  );
};

export default EntityPage;
