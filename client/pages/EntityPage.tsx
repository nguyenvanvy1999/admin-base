import AddEditEntityDialog from '@client/components/AddEditEntityDialog';
import EntityTable from '@client/components/EntityTable';
import {
  useCreateEntityMutation,
  useDeleteEntityMutation,
  useUpdateEntityMutation,
} from '@client/hooks/mutations/useEntityMutations';
import { useEntitiesQuery } from '@client/hooks/queries/useEntityQueries';
import type { EntityFormData, EntityFull } from '@client/types/entity';
import { Button, Group, Modal, MultiSelect, Text } from '@mantine/core';
import { EntityType } from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const EntityPage = () => {
  const { t } = useTranslation();
  const [selectedEntity, setSelectedEntity] = useState<EntityFull | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<EntityFull | null>(null);
  const [typeFilterInput, setTypeFilterInput] = useState<EntityType[]>([]);
  const [typeFilter, setTypeFilter] = useState<EntityType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'createdAt'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const queryParams = useMemo(
    () => ({
      type: typeFilter.length > 0 ? typeFilter : undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [typeFilter, searchQuery, page, limit, sortBy, sortOrder],
  );

  const { data, isLoading } = useEntitiesQuery(queryParams);
  const createMutation = useCreateEntityMutation();
  const updateMutation = useUpdateEntityMutation();
  const deleteMutation = useDeleteEntityMutation();

  const handleAdd = () => {
    setSelectedEntity(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (entity: EntityFull) => {
    setSelectedEntity(entity);
    setIsDialogOpen(true);
  };

  const handleDelete = (entity: EntityFull) => {
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

  const handleSubmit = async (formData: EntityFormData) => {
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
    if (entityToDelete) {
      try {
        await deleteMutation.mutateAsync(entityToDelete.id);
        handleDeleteDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || typeFilter.length > 0;
  }, [searchQuery, typeFilter]);

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
                {t('entities.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('entities.subtitle')}
              </p>
            </div>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {t('entities.addEntity')}
            </Button>
          </div>

          <EntityTable
            entities={data?.entities || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
            search={{
              onSearch: (searchValue: string) => {
                setSearchQuery(searchValue);
                setTypeFilter(typeFilterInput);
                setPage(1);
              },
              placeholder: t('entities.search'),
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
                setTypeFilterInput([]);
                setTypeFilter([]);
                setPage(1);
              },
              slots: [
                <MultiSelect
                  key="type-filter"
                  value={typeFilterInput}
                  onChange={(value) =>
                    setTypeFilterInput(value as EntityType[])
                  }
                  placeholder={t('entities.typePlaceholder')}
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
                />,
              ],
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
                setSortBy(newSortBy as 'name' | 'type' | 'createdAt');
                setSortOrder(newSortOrder);
                setPage(1);
              },
            }}
          />
        </div>

        {isDialogOpen && (
          <AddEditEntityDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            entity={selectedEntity}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
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
      </div>
    </div>
  );
};

export default EntityPage;
