import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import type { CategoryFormData, CategoryFull } from '@client/types/category';
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { CategoryType } from '@server/generated/prisma/enums';
import { useForm } from '@tanstack/react-form';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useValidation } from './utils/validation';

type AddEditCategoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryFull | null;
  parentId?: string | null;
  onSubmit: (data: CategoryFormData) => void;
  isLoading?: boolean;
};

const getCategoryLabel = (
  categoryName: string,
  t: (key: string) => string,
): string => {
  const translationKey = `categories.${categoryName}`;
  const translated = t(translationKey);
  return translated !== translationKey ? translated : categoryName;
};

const flattenCategories = (
  categories: CategoryFull[],
  t: (key: string) => string,
  excludeId?: string,
  depth = 0,
): Array<{ value: string; label: string; disabled?: boolean }> => {
  const result: Array<{ value: string; label: string; disabled?: boolean }> =
    [];

  for (const category of categories) {
    if (category.id === excludeId) {
      continue;
    }

    const prefix = '  '.repeat(depth);
    result.push({
      value: category.id,
      label: `${prefix}${getCategoryLabel(category.name, t)}`,
      disabled: category.isLocked,
    });

    if (category.children && category.children.length > 0) {
      result.push(
        ...flattenCategories(category.children, t, excludeId, depth + 1),
      );
    }
  }

  return result;
};

const AddEditCategoryDialog = ({
  isOpen,
  onClose,
  category,
  parentId,
  onSubmit,
  isLoading = false,
}: AddEditCategoryDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!category;
  const validation = useValidation();

  const { data: categoriesData } = useCategoriesQuery({});

  const parentOptions = useMemo(() => {
    if (!categoriesData?.categories) {
      return [];
    }

    const excludeId = isEditMode && category ? category.id : undefined;
    return flattenCategories(categoriesData.categories, t, excludeId);
  }, [categoriesData, isEditMode, category, t]);

  const filteredParentOptions = useMemo(() => {
    return parentOptions;
  }, [parentOptions]);

  const form = useForm({
    defaultValues: {
      name: '',
      type: '',
      parentId: null as string | null,
      icon: '',
      color: '',
    },
    onSubmit: ({ value }) => {
      const submitData: CategoryFormData = {
        name: value.name.trim(),
        type: value.type as CategoryType,
      };

      if (isEditMode && category) {
        submitData.id = category.id;
      }

      if (value.parentId) {
        submitData.parentId = value.parentId;
      } else {
        submitData.parentId = null;
      }

      if (value.icon && value.icon.trim() !== '') {
        submitData.icon = value.icon.trim();
      }

      if (value.color && value.color.trim() !== '') {
        submitData.color = value.color.trim();
      }

      onSubmit(submitData);
    },
  });

  useEffect(() => {
    if (category) {
      form.setFieldValue('name', category.name);
      form.setFieldValue('type', category.type);
      form.setFieldValue('parentId', category.parentId);
      form.setFieldValue('icon', category.icon || '');
      form.setFieldValue('color', category.color || '');
    } else if (parentId !== undefined) {
      form.setFieldValue('parentId', parentId);
    } else {
      form.reset();
    }
  }, [category, parentId, isOpen, form]);

  const categoryTypeOptions = [
    { value: CategoryType.expense, label: t('categories.expense') },
    { value: CategoryType.income, label: t('categories.income') },
    { value: CategoryType.transfer, label: t('categories.transfer') },
    { value: CategoryType.investment, label: t('categories.investment') },
    { value: CategoryType.loan, label: t('categories.loan') },
  ];

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        isEditMode ? t('categories.editCategory') : t('categories.addCategory')
      }
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <form.Field
            name="name"
            validators={{
              onChange: validation.required('categories.nameRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('categories.name')}
                  placeholder={t('categories.namePlaceholder')}
                  required
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field
            name="type"
            validators={{
              onChange: validation.required('categories.typeRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <Select
                  label={t('categories.type')}
                  placeholder={t('categories.typePlaceholder')}
                  required
                  data={categoryTypeOptions}
                  value={field.state.value ?? null}
                  onChange={(value) => field.handleChange(value ?? '')}
                  onBlur={field.handleBlur}
                  error={error}
                  disabled={isEditMode}
                />
              );
            }}
          </form.Field>

          <form.Field name="parentId">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <Select
                  label={t('categories.parent')}
                  placeholder={t('categories.parentPlaceholder')}
                  data={filteredParentOptions}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  error={error}
                  clearable
                  searchable
                />
              );
            }}
          </form.Field>

          <form.Field name="icon">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('categories.icon')}
                  placeholder={t('categories.iconPlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="color">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('categories.color')}
                  placeholder={t('categories.colorPlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              isValid: state.isValid,
              values: state.values,
            })}
          >
            {({ isValid, values }) => {
              const isFormValid =
                isValid &&
                values.name?.trim() !== '' &&
                values.type &&
                values.type.trim() !== '';

              return (
                <Group justify="flex-end" mt="md">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isLoading || !isFormValid}>
                    {isLoading
                      ? t('common.saving', { defaultValue: 'Saving...' })
                      : isEditMode
                        ? t('common.save')
                        : t('common.add')}
                  </Button>
                </Group>
              );
            }}
          </form.Subscribe>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditCategoryDialog;
