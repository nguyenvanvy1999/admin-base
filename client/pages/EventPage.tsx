import AddEditEventDialog from '@client/components/AddEditEventDialog';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import { DeleteManyConfirmationModal } from '@client/components/DeleteManyConfirmationModal';
import EventTable from '@client/components/EventTable';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateEventMutation,
  useDeleteEventMutation,
  useDeleteManyEventsMutation,
  useUpdateEventMutation,
} from '@client/hooks/mutations/useEventMutations';
import { useEventsQuery } from '@client/hooks/queries/useEventQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, TextInput } from '@mantine/core';
import {
  type EventResponse,
  type IUpsertEventDto,
  ListEventsQueryDto,
} from '@server/dto/event.dto';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const filterSchema = ListEventsQueryDto.pick({
  search: true,
});

const defaultFilterValues = {
  search: '',
};

const EventPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<
    'name' | 'startAt' | 'endAt' | 'created'
  >('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    isDialogOpen,
    selectedItem: selectedEvent,
    resetTrigger,
    handleAdd,
    handleEdit,
    handleClose: handleDialogClose,
    handleSaveAndAdd,
  } = usePageDialog<EventResponse>();

  const {
    isDeleteDialogOpen,
    itemToDelete: eventToDelete,
    handleDelete,
    handleDeleteDialogClose,
    handleConfirmDelete: handleConfirmDeleteBase,
    isDeleteManyDialogOpen,
    itemsToDeleteMany: eventsToDeleteMany,
    selectedRecords,
    setSelectedRecords,
    handleDeleteMany,
    handleDeleteManyDialogClose,
    handleConfirmDeleteMany: handleConfirmDeleteManyBase,
  } = usePageDelete<EventResponse>();

  const { control, reset, watch } = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const searchValue = watch('search');

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      sortBy,
      sortOrder,
      search: searchValue?.trim() || undefined,
    }),
    [page, limit, sortBy, sortOrder, searchValue],
  );

  const { data, isLoading, refetch } = useEventsQuery(queryParams);
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const deleteMutation = useDeleteEventMutation();
  const deleteManyMutation = useDeleteManyEventsMutation();

  const handleSubmitForm = async (
    formData: IUpsertEventDto,
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
                  placeholder={t('events.search')}
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
          {t('events.addEvent')}
        </Button>
      }
      onReset={() => {
        reset(defaultFilterValues);
        refetch();
      }}
    >
      <EventTable
        events={data?.events || []}
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
            setSortBy(
              newSorting[0].id as 'name' | 'startAt' | 'endAt' | 'created',
            );
            setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
          } else {
            setSortBy('created');
            setSortOrder('desc');
          }
          setPage(1);
        }}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
      />

      {isDialogOpen && (
        <AddEditEventDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          event={selectedEvent}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
          resetTrigger={resetTrigger}
        />
      )}

      {isDeleteDialogOpen && eventToDelete && (
        <DeleteConfirmationModal
          isOpen={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('events.deleteConfirmTitle')}
          message={t('events.deleteConfirmMessage')}
          itemName={eventToDelete.name}
        />
      )}

      {isDeleteManyDialogOpen && eventsToDeleteMany.length > 0 && (
        <DeleteManyConfirmationModal
          isOpen={isDeleteManyDialogOpen}
          onClose={handleDeleteManyDialogClose}
          onConfirm={handleConfirmDeleteMany}
          isLoading={isSubmitting}
          title={t('events.deleteManyConfirmTitle', {
            defaultValue: 'Delete Multiple Events',
          })}
          message={t('events.deleteManyConfirmMessage', {
            defaultValue: 'Are you sure you want to delete {{count}} event(s)?',
          })}
          count={eventsToDeleteMany.length}
        />
      )}
    </PageContainer>
  );
};

export default EventPage;
