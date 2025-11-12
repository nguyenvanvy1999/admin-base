import AddEditEntityDialog from '@client/components/AddEditEntityDialog';
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
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, Modal, MultiSelect, Text } from '@mantine/core';
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
  const [selectedEntity, setSelectedEntity] = useState<EntityResponse | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<EntityResponse | null>(
    null,
  );
  const [isDeleteManyDialogOpen, setIsDeleteManyDialogOpen] = useState(false);
  const [entitiesToDeleteMany, setEntitiesToDeleteMany] = useState<string[]>(
    [],
  );
  const [selectedRecords, setSelectedRecords] = useState<EntityResponse[]>([]);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'createdAt'>(
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

  const { data, isLoading } = useEntitiesQuery(
    queryParams,
    formRef,
    handleSubmit,
  );
  const createMutation = useCreateEntityMutation();
  const updateMutation = useUpdateEntityMutation();
  const deleteMutation = useDeleteEntityMutation();
  const deleteManyMutation = useDeleteManyEntitiesMutation();

  const handleAdd = () => {
    setSelectedEntity(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (entity: EntityResponse) => {
    setSelectedEntity(entity);
    setIsDialogOpen(true);
  };

  const handleDelete = (entity: EntityResponse) => {
    setEntityToDelete(entity);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEntity(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setEntityToDelete(null);
  };

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
        setSelectedEntity(null);
        setResetTrigger((prev) => prev + 1);
      } else {
        handleDialogClose();
      }
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    if (entityToDelete) {
      try {
        await deleteMutation.mutateAsync(entityToDelete.id);
        handleDeleteDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const handleDeleteMany = (ids: string[]) => {
    setEntitiesToDeleteMany(ids);
    setIsDeleteManyDialogOpen(true);
  };

  const handleDeleteManyDialogClose = () => {
    setIsDeleteManyDialogOpen(false);
    setEntitiesToDeleteMany([]);
    setSelectedRecords([]);
  };

  const handleConfirmDeleteMany = async () => {
    if (entitiesToDeleteMany.length > 0) {
      try {
        await deleteManyMutation.mutateAsync(entitiesToDeleteMany);
        handleDeleteManyDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
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
        <Modal
          opened={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          title={t('entities.deleteConfirmTitle')}
          size="md"
        >
          <Text mb="md">
            {t('entities.deleteConfirmMessage')}
            <br />
            <strong>{entityToDelete.name}</strong>
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

      {isDeleteManyDialogOpen && entitiesToDeleteMany.length > 0 && (
        <Modal
          opened={isDeleteManyDialogOpen}
          onClose={handleDeleteManyDialogClose}
          title={t('entities.deleteManyConfirmTitle', {
            defaultValue: 'Delete Multiple Entities',
          })}
          size="md"
        >
          <Text mb="md">
            {t('entities.deleteManyConfirmMessage', {
              defaultValue:
                'Are you sure you want to delete {{count}} entity(ies)?',
              count: entitiesToDeleteMany.length,
            })}
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={handleDeleteManyDialogClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDeleteMany}
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

export default EntityPage;
