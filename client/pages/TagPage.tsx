import AddEditTagDialog from '@client/components/AddEditTagDialog';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import TagTable from '@client/components/TagTable';
import { TextInput } from '@client/components/TextInput';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useUpdateTagMutation,
} from '@client/hooks/mutations/useTagMutations';
import {
  type FilterFormValue,
  useTagsQuery,
} from '@client/hooks/queries/useTagQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, Modal, Text } from '@mantine/core';
import type { IUpsertTagDto, TagResponse } from '@server/dto/tag.dto';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
});

const defaultFilterValues: FilterFormValue = {
  search: '',
};

const TagPage = () => {
  const { t } = useTranslation();
  const formRef = useRef<FormComponentRef>(null);
  const [selectedTag, setSelectedTag] = useState<TagResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagResponse | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
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

  const { data, isLoading } = useTagsQuery(queryParams, formRef, handleSubmit);
  const createMutation = useCreateTagMutation();
  const updateMutation = useUpdateTagMutation();
  const deleteMutation = useDeleteTagMutation();

  const handleAdd = () => {
    setSelectedTag(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (tag: TagResponse) => {
    setSelectedTag(tag);
    setIsDialogOpen(true);
  };

  const handleDelete = (tag: TagResponse) => {
    setTagToDelete(tag);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTag(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setTagToDelete(null);
  };

  const handleSubmitForm = async (formData: IUpsertTagDto) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(
          formData as IUpsertTagDto & { id: string },
        );
      } else {
        await createMutation.mutateAsync(formData);
      }
      handleDialogClose();
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    if (tagToDelete) {
      try {
        await deleteMutation.mutateAsync(tagToDelete.id);
        handleDeleteDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

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
      />

      {isDialogOpen && (
        <AddEditTagDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          tag={selectedTag}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
        />
      )}

      {isDeleteDialogOpen && tagToDelete && (
        <Modal
          opened={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          title={t('tags.deleteConfirmTitle')}
          size="md"
        >
          <Text mb="md">
            {t('tags.deleteConfirmMessage')}
            <br />
            <strong>{tagToDelete.name}</strong>
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
    </PageContainer>
  );
};

export default TagPage;
