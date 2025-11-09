import AddEditTagDialog from '@client/components/AddEditTagDialog';
import TagTable from '@client/components/TagTable';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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

          <TagTable
            tags={data?.tags || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
            search={{
              onSearch: (searchValue: string) => {
                setSearchQuery(searchValue);
                setPage(1);
              },
              placeholder: t('tags.search'),
            }}
            pageSize={{
              initialSize: limit,
              onPageSizeChange: (size: number) => {
                setLimit(size);
                setPage(1);
              },
            }}
            filters={{
              hasActive: hasActiveFilters,
              onReset: () => {
                setSearchQuery('');
                setPage(1);
              },
              slots: [],
            }}
            pagination={
              data?.pagination && data.pagination.totalPages > 0
                ? {
                    currentPage: page,
                    totalPages: data.pagination.totalPages,
                    totalItems: data.pagination.total,
                    itemsPerPage: limit,
                    onPageChange: setPage,
                  }
                : undefined
            }
            sorting={{
              sortBy,
              sortOrder,
              onSortChange: (
                newSortBy: string,
                newSortOrder: 'asc' | 'desc',
              ) => {
                setSortBy(newSortBy as 'name' | 'createdAt');
                setSortOrder(newSortOrder);
                setPage(1);
              },
            }}
          />
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
