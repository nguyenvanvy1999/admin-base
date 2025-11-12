import AddEditTagDialog from '@client/components/AddEditTagDialog';
import TagTable from '@client/components/TagTable';
import { TextInput } from '@client/components/TextInput';
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useUpdateTagMutation,
} from '@client/hooks/mutations/useTagMutations';
import { useTagsQuery } from '@client/hooks/queries/useTagQueries';
import type { TagFormData, TagFull } from '@client/types/tag';
import { Button, Group, Modal, Text } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const TagPage = () => {
  const { t } = useTranslation();
  const [selectedTag, setSelectedTag] = useState<TagFull | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagFull | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const queryParams = useMemo(
    () => ({
      search: searchQuery.trim() || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [searchQuery, page, limit, sortBy, sortOrder],
  );

  const { data, isLoading } = useTagsQuery(queryParams);
  const createMutation = useCreateTagMutation();
  const updateMutation = useUpdateTagMutation();
  const deleteMutation = useDeleteTagMutation();

  const handleAdd = () => {
    setSelectedTag(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (tag: TagFull) => {
    setSelectedTag(tag);
    setIsDialogOpen(true);
  };

  const handleDelete = (tag: TagFull) => {
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

  const handleSubmit = async (formData: TagFormData) => {
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
    if (tagToDelete) {
      try {
        await deleteMutation.mutateAsync(tagToDelete.id);
        handleDeleteDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '';
  }, [searchQuery]);

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('tags.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('tags.subtitle')}
              </p>
            </div>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {t('tags.addTag')}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <TextInput
                placeholder={t('tags.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                  }
                }}
                style={{ flex: 1, maxWidth: '300px' }}
              />
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                >
                  {t('common.reset', { defaultValue: 'Reset' })}
                </Button>
              )}
            </div>

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
              onSortingChange={(updater) => {
                const newSorting =
                  typeof updater === 'function'
                    ? updater(
                        sortBy
                          ? [{ id: sortBy, desc: sortOrder === 'desc' }]
                          : [],
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
          </div>
        </div>

        {isDialogOpen && (
          <AddEditTagDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            tag={selectedTag}
            onSubmit={handleSubmit}
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
      </div>
    </div>
  );
};

export default TagPage;
