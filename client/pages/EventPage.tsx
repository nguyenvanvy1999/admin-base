import AddEditEventDialog from '@client/components/AddEditEventDialog';
import EventTable from '@client/components/EventTable';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import { TextInput } from '@client/components/TextInput';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateEventMutation,
  useDeleteEventMutation,
  useDeleteManyEventsMutation,
  useUpdateEventMutation,
} from '@client/hooks/mutations/useEventMutations';
import { useEventsQuery } from '@client/hooks/queries/useEventQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, Modal, Text } from '@mantine/core';
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
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventResponse | null>(
    null,
  );
  const [isDeleteManyDialogOpen, setIsDeleteManyDialogOpen] = useState(false);
  const [eventsToDeleteMany, setEventsToDeleteMany] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<EventResponse[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<
    'name' | 'startAt' | 'endAt' | 'createdAt'
  >('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const { data, isLoading } = useEventsQuery(queryParams);
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const deleteMutation = useDeleteEventMutation();
  const deleteManyMutation = useDeleteManyEventsMutation();

  const handleAdd = () => {
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: EventResponse) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleDelete = (event: EventResponse) => {
    setEventToDelete(event);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  const handleSubmitForm = async (formData: IUpsertEventDto) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
      handleDialogClose();
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete) {
      try {
        await deleteMutation.mutateAsync(eventToDelete.id);
        handleDeleteDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const handleDeleteMany = (ids: string[]) => {
    setEventsToDeleteMany(ids);
    setIsDeleteManyDialogOpen(true);
  };

  const handleDeleteManyDialogClose = () => {
    setIsDeleteManyDialogOpen(false);
    setEventsToDeleteMany([]);
    setSelectedRecords([]);
  };

  const handleConfirmDeleteMany = async () => {
    if (eventsToDeleteMany.length > 0) {
      try {
        await deleteManyMutation.mutateAsync(eventsToDeleteMany);
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
      onReset={() => reset(defaultFilterValues)}
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
              newSorting[0].id as 'name' | 'startAt' | 'endAt' | 'createdAt',
            );
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
        <AddEditEventDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          event={selectedEvent}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
        />
      )}

      {isDeleteDialogOpen && eventToDelete && (
        <Modal
          opened={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          title={t('events.deleteConfirmTitle')}
          size="md"
        >
          <Text mb="md">
            {t('events.deleteConfirmMessage')}
            <br />
            <strong>{eventToDelete.name}</strong>
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

      {isDeleteManyDialogOpen && eventsToDeleteMany.length > 0 && (
        <Modal
          opened={isDeleteManyDialogOpen}
          onClose={handleDeleteManyDialogClose}
          title={t('events.deleteManyConfirmTitle', {
            defaultValue: 'Delete Multiple Events',
          })}
          size="md"
        >
          <Text mb="md">
            {t('events.deleteManyConfirmMessage', {
              defaultValue: 'Are you sure you want to delete {count} event(s)?',
              count: eventsToDeleteMany.length,
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

export default EventPage;
