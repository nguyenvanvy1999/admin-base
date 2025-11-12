import AddEditCategoryDialog from '@client/components/AddEditCategoryDialog';
import {
  getCategoryIcon,
  getCategoryLabel,
} from '@client/components/utils/category';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '@client/hooks/mutations/useCategoryMutations';
import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  MultiSelect,
  Text,
  TextInput,
} from '@mantine/core';
import { Add, Category, Close, Delete, Edit, Lock } from '@mui/icons-material';
import { Box, IconButton, Stack } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import type {
  CategoryTreeResponse,
  IUpsertCategoryDto,
} from '@server/dto/category.dto';
import { CategoryType } from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type MUITreeItem = {
  id: string;
  label: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  isLocked: boolean;
  parentId: string | null;
  children?: MUITreeItem[];
};

const transformToMUITree = (
  categories: CategoryTreeResponse[],
  t: (key: string) => string,
): MUITreeItem[] => {
  return categories.map((category) => ({
    id: category.id,
    label: getCategoryLabel(category.name, t),
    type: category.type,
    icon: category.icon,
    color: category.color,
    isLocked: category.isLocked,
    parentId: category.parentId,
    children: category.children
      ? transformToMUITree(category.children as CategoryTreeResponse[], t)
      : undefined,
  }));
};

const flattenTree = (items: MUITreeItem[]): MUITreeItem[] => {
  const result: MUITreeItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children) {
      result.push(...flattenTree(item.children));
    }
  }
  return result;
};

const filterTree = (
  items: MUITreeItem[],
  searchQuery: string,
  typeFilter: CategoryType[],
): MUITreeItem[] => {
  if (!searchQuery && typeFilter.length === 0) {
    return items;
  }

  const filtered: MUITreeItem[] = [];

  for (const item of items) {
    const matchesSearch =
      !searchQuery ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      typeFilter.length === 0 || typeFilter.includes(item.type);

    const filteredChildren = item.children
      ? filterTree(item.children, searchQuery, typeFilter)
      : undefined;

    if (matchesSearch && matchesType) {
      filtered.push({
        ...item,
        children: filteredChildren,
      });
    } else if (filteredChildren && filteredChildren.length > 0) {
      filtered.push({
        ...item,
        children: filteredChildren,
      });
    }
  }

  return filtered;
};

const CategoryPage = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryTreeResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<CategoryTreeResponse | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [typeFilterInput, setTypeFilterInput] = useState<CategoryType[]>([]);
  const [typeFilter, setTypeFilter] = useState<CategoryType[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      type: typeFilter.length > 0 ? typeFilter : undefined,
    }),
    [typeFilter],
  );

  const { data, isLoading } = useCategoriesQuery(queryParams);
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();

  const treeItems = useMemo(() => {
    if (!data?.categories) {
      return [];
    }
    return transformToMUITree(data.categories, t);
  }, [data, t]);

  const filteredTreeItems = useMemo(() => {
    return filterTree(treeItems, searchQuery, typeFilter);
  }, [treeItems, searchQuery, typeFilter]);

  const allCategoriesFlat = useMemo(() => {
    if (!data?.categories) {
      return [];
    }
    return flattenTree(transformToMUITree(data.categories, t));
  }, [data, t]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryTreeResponse>();
    const addToMap = (categories: CategoryTreeResponse[]) => {
      for (const category of categories) {
        map.set(category.id, category);
        if (category.children) {
          addToMap(category.children as CategoryTreeResponse[]);
        }
      }
    };
    if (data?.categories) {
      addToMap(data.categories);
    }
    return map;
  }, [data]);

  const handleAddRoot = () => {
    setSelectedCategory(null);
    setParentIdForNew(null);
    setIsDialogOpen(true);
  };

  const handleAddChild = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      setSelectedCategory(null);
      setParentIdForNew(categoryId);
      setIsDialogOpen(true);
    }
  };

  const handleEdit = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      setSelectedCategory(category);
      setParentIdForNew(null);
      setIsDialogOpen(true);
    }
  };

  const handleDelete = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      setCategoryToDelete(category);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedCategory(null);
    setParentIdForNew(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleSubmit = async (formData: IUpsertCategoryDto) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
      handleDialogClose();
      if (formData.parentId) {
        setExpandedItems((prev) => [...prev, formData.parentId!]);
      }
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      try {
        await deleteMutation.mutateAsync(categoryToDelete.id);
        handleDeleteDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || typeFilter.length > 0;
  }, [searchQuery, typeFilter]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setTypeFilter(typeFilterInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleReset = () => {
    setSearchInput('');
    setSearchQuery('');
    setTypeFilterInput([]);
    setTypeFilter([]);
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900 flex flex-col">
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('categories.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('categories.subtitle')}
              </p>
            </div>
            <Button onClick={handleAddRoot} disabled={isSubmitting}>
              {t('categories.addRootCategory')}
            </Button>
          </div>

          <Stack gap="md" mb="md">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-64">
                <TextInput
                  placeholder={t('categories.search')}
                  value={searchInput}
                  onChange={(e) =>
                    setSearchInput((e.target as HTMLInputElement).value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  rightSection={
                    searchInput.trim() !== '' ? (
                      <ActionIcon
                        size="sm"
                        variant="transparent"
                        onClick={handleClearSearch}
                        disabled={isLoading}
                      >
                        <Close fontSize="small" />
                      </ActionIcon>
                    ) : null
                  }
                />
              </div>

              <div className="w-full md:w-48">
                <MultiSelect
                  placeholder={t('categories.filterByType')}
                  value={typeFilterInput}
                  onChange={(value) =>
                    setTypeFilterInput(value as CategoryType[])
                  }
                  data={[
                    {
                      value: CategoryType.expense,
                      label: t('categories.expense'),
                    },
                    {
                      value: CategoryType.income,
                      label: t('categories.income'),
                    },
                    {
                      value: CategoryType.transfer,
                      label: t('categories.transfer'),
                    },
                    {
                      value: CategoryType.investment,
                      label: t('categories.investment'),
                    },
                    {
                      value: CategoryType.loan,
                      label: t('categories.loan'),
                    },
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
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    {t('common.reset', { defaultValue: 'Reset' })}
                  </Button>
                )}
              </div>
            </div>
          </Stack>

          {isLoading ? (
            <div className="text-center py-8">
              <Text>{t('common.loading', { defaultValue: 'Loading...' })}</Text>
            </div>
          ) : filteredTreeItems.length === 0 ? (
            <div className="text-center py-8">
              <Text>{t('categories.noCategories')}</Text>
            </div>
          ) : (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <RichTreeView
                items={filteredTreeItems}
                expandedItems={expandedItems}
                onExpandedItemsChange={(_event: unknown, itemIds: string[]) => {
                  setExpandedItems(itemIds);
                }}
                selectedItems={selectedItems}
                onSelectedItemsChange={(
                  _event: unknown,
                  itemIds: string | null,
                ) => {
                  setSelectedItems(itemIds);
                }}
                slotProps={{
                  item: (ownerState) => {
                    const item = allCategoriesFlat.find(
                      (cat) => cat.id === ownerState.itemId,
                    );
                    if (item) {
                      const category = categoryMap.get(item.id);
                      const canAddChild = category && !category.parentId;
                      const canEdit = category && !category.isLocked;
                      const canDelete =
                        category &&
                        !category.isLocked &&
                        (!category.children || category.children.length === 0);

                      const IconComponent = category?.name
                        ? getCategoryIcon(category.name)
                        : Category;

                      return {
                        label: (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              width: '100%',
                              paddingRight: 1,
                            }}
                          >
                            <Box
                              sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <IconComponent
                                sx={{
                                  fontSize: 18,
                                  color: item.color || 'inherit',
                                  opacity: 0.8,
                                }}
                              />
                              {item.color && (
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: item.color,
                                  }}
                                />
                              )}
                              <Box
                                component="span"
                                sx={{ fontSize: '0.875rem' }}
                              >
                                {ownerState.label}
                              </Box>
                              {item.isLocked && (
                                <Lock sx={{ fontSize: 14, opacity: 0.6 }} />
                              )}
                            </Box>
                            <Box
                              sx={{ display: 'flex', gap: 0.5 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canAddChild && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleAddChild(item.id)}
                                  title={t('categories.addChild')}
                                >
                                  <Add sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                              {canEdit && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(item.id)}
                                  title={t('categories.editCategory')}
                                >
                                  <Edit sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                              {canDelete && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(item.id)}
                                  title={t('categories.deleteCategory')}
                                >
                                  <Delete sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        ),
                      };
                    }
                    return {};
                  },
                }}
              />
            </Box>
          )}
        </div>

        {isDialogOpen && (
          <AddEditCategoryDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            category={selectedCategory}
            parentId={parentIdForNew}
            parentType={
              parentIdForNew
                ? (categoryMap.get(parentIdForNew)?.type ?? null)
                : null
            }
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        )}

        {isDeleteDialogOpen && categoryToDelete && (
          <Modal
            opened={isDeleteDialogOpen}
            onClose={handleDeleteDialogClose}
            title={t('categories.deleteConfirmTitle')}
            size="md"
          >
            <Text mb="md">
              {t('categories.deleteConfirmMessage')}
              <br />
              <strong>{categoryToDelete.name}</strong>
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

export default CategoryPage;
