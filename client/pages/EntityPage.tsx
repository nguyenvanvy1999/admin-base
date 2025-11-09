import AddEditEntityDialog from '@client/components/AddEditEntityDialog';
import EntityTable from '@client/components/EntityTable';
import Pagination from '@client/components/Pagination';
import {
  useCreateEntityMutation,
  useDeleteEntityMutation,
  useUpdateEntityMutation,
} from '@client/hooks/mutations/useEntityMutations';
import { useEntitiesQuery } from '@client/hooks/queries/useEntityQueries';
import type { EntityFormData, EntityFull } from '@client/types/entity';
import { Button, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import { EntityType } from '@server/generated/prisma/enums';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const EntityPage = () => {
  const { t } = useTranslation();
  const [selectedEntity, setSelectedEntity] = useState<EntityFull | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<EntityFull | null>(null);
  const [typeFilterInput, setTypeFilterInput] = useState<EntityType | ''>('');
  const [typeFilter, setTypeFilter] = useState<EntityType | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryParams = useMemo(
    () => ({
      type: (typeFilter || undefined) as EntityType | undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    }),
    [typeFilter, searchQuery, page, limit],
  );

  const { data, isLoading, refetch } = useEntitiesQuery(queryParams);
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

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    [],
  );

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput);
    setTypeFilter(typeFilterInput);
    setPage(1);
    refetch();
  }, [searchInput, typeFilterInput, refetch]);

  const handleTypeFilterChange = useCallback((value: string | null) => {
    setTypeFilterInput((value as EntityType) || '');
  }, []);

  const handlePageSizeChange = useCallback((value: string | null) => {
    const newLimit = value ? parseInt(value, 10) : 20;
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
    setTypeFilterInput('');
    setTypeFilter('');
    setPage(1);
    refetch();
  }, [refetch]);

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || typeFilter !== '';
  }, [searchQuery, typeFilter]);

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

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-64">
              <TextInput
                value={searchInput}
                onChange={(e) =>
                  handleSearchInputChange(
                    e as React.ChangeEvent<HTMLInputElement>,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder={t('entities.search')}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={typeFilterInput || null}
                onChange={handleTypeFilterChange}
                placeholder={t('entities.typePlaceholder')}
                data={[
                  { value: '', label: t('entities.all') },
                  {
                    value: EntityType.individual,
                    label: t('entities.individual'),
                  },
                  {
                    value: EntityType.organization,
                    label: t('entities.organization'),
                  },
                ]}
              />
            </div>
            <div className="w-full md:w-32">
              <Select
                value={limit.toString()}
                onChange={handlePageSizeChange}
                placeholder={t('entities.pageSizeLabel')}
                data={[
                  { value: '10', label: '10' },
                  { value: '20', label: '20' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                ]}
              />
            </div>
            <div className="w-full md:w-auto flex gap-2">
              <Button onClick={handleSearch} disabled={isLoading}>
                {t('common.search')}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  disabled={isLoading}
                >
                  {t('entities.clearFilters')}
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-hidden">
            <EntityTable
              entities={data?.entities || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>

          {data?.pagination && data.pagination.totalPages > 0 && (
            <Pagination
              currentPage={page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.total}
              itemsPerPage={limit}
              onPageChange={setPage}
              isLoading={isLoading}
            />
          )}
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
