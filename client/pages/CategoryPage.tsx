import AddEditCategoryDialog from '@client/components/AddEditCategoryDialog';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '@client/hooks/mutations/useCategoryMutations';
import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import type {
  CategoryFormData,
  CategoryFull,
  MUITreeItem,
} from '@client/types/category';
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  Text,
  TextInput,
} from '@mantine/core';
import { Add, Delete, Edit, Lock } from '@mui/icons-material';
import { Box, IconButton, Stack } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { CategoryType } from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const getCategoryLabel = (
  categoryName: string,
  t: (key: string) => string,
): string => {
  const translationKey = `categories.${categoryName}`;
  const translated = t(translationKey);
  return translated !== translationKey ? translated : categoryName;
};

const transformToMUITree = (
  categories: CategoryFull[],
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
      ? transformToMUITree(category.children, t)
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryFull | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryFull | null>(
    null,
  );
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [typeFilterInput, setTypeFilterInput] = useState<CategoryType[]>([]);
  const [typeFilter, setTypeFilter] = useState<CategoryType[]>([]);
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
    const map = new Map<string, CategoryFull>();
    const addToMap = (categories: CategoryFull[]) => {
      for (const category of categories) {
        map.set(category.id, category);
        if (category.children) {
          addToMap(category.children);
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
    setSelectedCategory(null);
    setParentIdForNew(categoryId);
    setIsDialogOpen(true);
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

  const handleSubmit = async (formData: CategoryFormData) => {
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
            <div className="flex gap-4 items-end">
              <TextInput
                placeholder={t('categories.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
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
                style={{ width: 200 }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilterInput([]);
                  setTypeFilter([]);
                }}
                disabled={!hasActiveFilters}
              >
                {t('common.reset')}
              </Button>
              <Button
                variant="filled"
                onClick={() => {
                  setTypeFilter(typeFilterInput);
                  setSearchQuery(searchQuery);
                }}
                disabled={!hasActiveFilters}
              >
                {t('common.search')}
              </Button>
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
            <Box sx={{ minHeight: 400, maxHeight: 600, overflow: 'auto' }}>
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
                      const canEdit = category && !category.isLocked;
                      const canDelete =
                        category &&
                        !category.isLocked &&
                        (!category.children || category.children.length === 0);

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
                              {item.icon && <span>{item.icon}</span>}
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
                              {canEdit && (
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
