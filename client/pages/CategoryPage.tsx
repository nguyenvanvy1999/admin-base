import AddEditCategoryDialog from '@client/components/AddEditCategoryDialog';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
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
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import {
  ActionIcon,
  Box,
  Button,
  Container,
  Group,
  MultiSelect,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tree,
  type TreeNodeData,
  useTree,
} from '@mantine/core';
import type {
  CategoryTreeResponse,
  IUpsertCategoryDto,
} from '@server/dto/category.dto';
import { CategoryType } from '@server/generated/browser-index';
import {
  IconCategory,
  IconEdit,
  IconLock,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type MantineTreeItem = TreeNodeData & {
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  isLocked: boolean;
  parentId: string | null;
  originalId: string;
};

const transformToMantineTree = (
  categories: CategoryTreeResponse[],
  t: TFunction<'translation', undefined>,
): MantineTreeItem[] => {
  return categories.map((category) => ({
    value: category.id,
    label: getCategoryLabel(category.name, t),
    type: category.type,
    icon: category.icon,
    color: category.color,
    isLocked: category.isLocked,
    parentId: category.parentId,
    originalId: category.id,
    children: category.children
      ? transformToMantineTree(category.children as CategoryTreeResponse[], t)
      : undefined,
  }));
};

const flattenTree = (items: MantineTreeItem[]): MantineTreeItem[] => {
  const result: MantineTreeItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children) {
      result.push(...flattenTree(item.children as MantineTreeItem[]));
    }
  }
  return result;
};

const filterTree = (
  items: MantineTreeItem[],
  searchQuery: string,
  typeFilter: CategoryType[],
): MantineTreeItem[] => {
  if (!searchQuery && typeFilter.length === 0) {
    return items;
  }

  const filtered: MantineTreeItem[] = [];

  for (const item of items) {
    const labelText =
      typeof item.label === 'string' ? item.label : String(item.label || '');
    const matchesSearch =
      !searchQuery ||
      labelText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      typeFilter.length === 0 || typeFilter.includes(item.type);

    const filteredChildren = item.children
      ? filterTree(item.children as MantineTreeItem[], searchQuery, typeFilter)
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
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);

  const dialog = usePageDialog<CategoryTreeResponse>();
  const deleteHandler = usePageDelete<CategoryTreeResponse>();
  const [typeFilterInput, setTypeFilterInput] = useState<CategoryType[]>([]);
  const [typeFilter, setTypeFilter] = useState<CategoryType[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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
    return transformToMantineTree(data.categories, t);
  }, [data, t]);

  const filteredTreeItems = useMemo(() => {
    return filterTree(treeItems, searchQuery, typeFilter);
  }, [treeItems, searchQuery, typeFilter]);

  const allCategoriesFlat = useMemo(() => {
    if (!data?.categories) {
      return [];
    }
    return flattenTree(transformToMantineTree(data.categories, t));
  }, [data, t]);

  const tree = useTree({
    initialExpandedState: Object.fromEntries(
      expandedItems.map((id) => [id, true]),
    ),
    initialSelectedState: selectedItems,
    multiple: false,
    onNodeExpand: (value) => {
      setExpandedItems((prev) => {
        if (!prev.includes(value)) {
          return [...prev, value];
        }
        return prev;
      });
    },
    onNodeCollapse: (value) => {
      setExpandedItems((prev) => prev.filter((id) => id !== value));
    },
  });

  useEffect(() => {
    setSelectedItems(tree.selectedState);
  }, [tree.selectedState]);

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
    dialog.handleAdd();
    setParentIdForNew(null);
  };

  const handleAddChild = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      dialog.handleAdd();
      setParentIdForNew(categoryId);
    }
  };

  const handleEdit = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      dialog.handleEdit(category);
      setParentIdForNew(null);
    }
  };

  const handleDelete = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      deleteHandler.handleDelete(category);
    }
  };

  const handleDialogClose = () => {
    dialog.handleClose();
    setParentIdForNew(null);
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
        tree.expand(formData.parentId);
      }
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    await deleteHandler.handleConfirmDelete(deleteMutation.mutateAsync);
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
    <Container
      fluid
      h="100vh"
      p={0}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Box style={{ flex: 1, overflow: 'auto' }} p="md">
        <Paper
          p="lg"
          h="100%"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <Group justify="space-between" align="flex-start" mb="lg">
            <Stack gap="xs">
              <Title order={2}>{t('categories.title')}</Title>
              <Text size="sm" c="dimmed">
                {t('categories.subtitle')}
              </Text>
            </Stack>
            <Button onClick={handleAddRoot} disabled={isSubmitting}>
              {t('categories.addRootCategory')}
            </Button>
          </Group>

          <Stack gap="md" mb="md">
            <Group gap="md" align="flex-start" wrap="wrap">
              <Box style={{ width: '100%', maxWidth: '256px' }}>
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
                        <IconX size={16} />
                      </ActionIcon>
                    ) : null
                  }
                />
              </Box>

              <Box style={{ width: '100%', maxWidth: '192px' }}>
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
              </Box>

              <Group gap="xs">
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
              </Group>
            </Group>
          </Stack>

          {isLoading ? (
            <Stack align="center" py="xl">
              <Text>{t('common.loading', { defaultValue: 'Loading...' })}</Text>
            </Stack>
          ) : filteredTreeItems.length === 0 ? (
            <Stack align="center" py="xl">
              <Text>{t('categories.noCategories')}</Text>
            </Stack>
          ) : (
            <Box style={{ flex: 1, overflow: 'auto' }}>
              <Tree
                data={filteredTreeItems}
                tree={tree}
                selectOnClick
                renderNode={({ node, elementProps }) => {
                  const item = allCategoriesFlat.find(
                    (cat) => cat.value === node.value,
                  );
                  if (!item) {
                    return null;
                  }

                  const category = categoryMap.get(item.originalId);
                  const canAddChild = category && !category.parentId;
                  const canEdit = category && !category.isLocked;
                  const canDelete =
                    category &&
                    !category.isLocked &&
                    (!category.children || category.children.length === 0);

                  const IconComponent = category?.name
                    ? getCategoryIcon(category.name)
                    : IconCategory;

                  return (
                    <Group
                      {...elementProps}
                      gap="xs"
                      style={{
                        width: '100%',
                        paddingRight: 8,
                        flexWrap: 'nowrap',
                      }}
                    >
                      <Group
                        gap="xs"
                        style={{ flex: 1, flexWrap: 'nowrap' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (elementProps.onClick) {
                            elementProps.onClick(e);
                          }
                        }}
                      >
                        <IconComponent
                          size={18}
                          color={item.color || undefined}
                          style={{ opacity: 0.8 }}
                        />
                        {item.color && (
                          <Box
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: item.color,
                            }}
                          />
                        )}
                        <Text size="sm" style={{ flex: 1 }}>
                          {node.label}
                        </Text>
                        {item.isLocked && (
                          <IconLock size={14} style={{ opacity: 0.6 }} />
                        )}
                      </Group>
                      <Group
                        gap={4}
                        onClick={(e) => e.stopPropagation()}
                        style={{ flexWrap: 'nowrap' }}
                      >
                        {canAddChild && (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => handleAddChild(item.originalId)}
                            title={t('categories.addChild')}
                          >
                            <IconPlus size={14} />
                          </ActionIcon>
                        )}
                        {canEdit && (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => handleEdit(item.originalId)}
                            title={t('categories.editCategory')}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        )}
                        {canDelete && (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => handleDelete(item.originalId)}
                            title={t('categories.deleteCategory')}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Group>
                  );
                }}
              />
            </Box>
          )}

          {dialog.isDialogOpen && (
            <AddEditCategoryDialog
              isOpen={dialog.isDialogOpen}
              onClose={handleDialogClose}
              category={dialog.selectedItem}
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

          {deleteHandler.isDeleteDialogOpen && deleteHandler.itemToDelete && (
            <DeleteConfirmationModal
              isOpen={deleteHandler.isDeleteDialogOpen}
              onClose={deleteHandler.handleDeleteDialogClose}
              onConfirm={handleConfirmDelete}
              isLoading={isSubmitting}
              title={t('categories.deleteConfirmTitle')}
              message={t('categories.deleteConfirmMessage')}
              itemName={deleteHandler.itemToDelete.name}
            />
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default CategoryPage;
