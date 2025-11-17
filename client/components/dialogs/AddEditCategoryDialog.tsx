import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { TextInput } from '@mantine/core';
import {
  type CategoryTreeResponse,
  type IUpsertCategoryDto,
  UpsertCategoryDto,
} from '@server/dto/category.dto';
import { CategoryType } from '@server/generated';
import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Select } from '../Select';
import { ZodFormController } from '../ZodFormController';
import { CRUDDialog } from './CRUDDialog';

const getCategoryLabel = (
  categoryName: string,
  t: TFunction<'translation', undefined>,
): string => {
  const translationKey = `categories.${categoryName}`;
  const translated = t(translationKey as any);
  return translated !== translationKey ? translated : categoryName;
};

const flattenCategories = (
  categories: CategoryTreeResponse[],
  t: TFunction<'translation', undefined>,
  excludeId?: string,
  depth = 0,
  onlyLevel1 = false,
): Array<{ value: string; label: string; disabled?: boolean }> => {
  const result: Array<{ value: string; label: string; disabled?: boolean }> =
    [];

  for (const category of categories) {
    if (category.id === excludeId) {
      continue;
    }

    if (onlyLevel1 && category.parentId !== null) {
      continue;
    }

    const prefix = '  '.repeat(depth);
    result.push({
      value: category.id,
      label: `${prefix}${getCategoryLabel(category.name, t)}`,
      disabled: category.isLocked,
    });

    if (!onlyLevel1 && category.children && category.children.length > 0) {
      result.push(
        ...flattenCategories(
          category.children as CategoryTreeResponse[],
          t,
          excludeId,
          depth + 1,
          false,
        ),
      );
    }
  }

  return result;
};

const schema = UpsertCategoryDto.extend({
  name: z.string().min(1, 'categories.nameRequired'),
  type: z.enum(CategoryType, {
    message: 'categories.typeRequired',
  }),
  parentId: z.string().nullable().optional(),
});

type FormValue = z.infer<typeof schema>;

type AddEditCategoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryTreeResponse | null;
  parentId?: string | null;
  parentType?: CategoryType | null;
  onSubmit: (data: IUpsertCategoryDto) => void;
  isLoading?: boolean;
};

const AddEditCategoryDialog = ({
  isOpen,
  onClose,
  category,
  parentId,
  parentType,
  onSubmit,
  isLoading = false,
}: AddEditCategoryDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!category;
  const isAddChildMode =
    !isEditMode && parentId !== undefined && parentId !== null;

  const { data: categoriesData } = useCategoriesQuery({});

  const parentOptions = useMemo(() => {
    if (!categoriesData?.categories) {
      return [];
    }
    const excludeId = isEditMode ? category.id : undefined;
    return flattenCategories(categoriesData.categories, t, excludeId, 0, true);
  }, [categoriesData, isEditMode, category, t]);

  const defaultValues: FormValue = useMemo(
    () => ({
      name: '',
      type: parentType || CategoryType.expense,
      parentId: parentId || null,
      icon: '',
      color: '',
    }),
    [parentId, parentType],
  );

  const getFormValues = (cat: CategoryTreeResponse): FormValue => ({
    id: cat.id,
    name: cat.name,
    type: cat.type,
    parentId: cat.parentId,
    icon: cat.icon || '',
    color: cat.color || '',
  });

  const handleSubmit = (data: FormValue) => {
    const submitData: IUpsertCategoryDto = {
      name: data.name.trim(),
      type: data.type,
    };

    if (isEditMode && category) {
      submitData.id = category.id;
    }

    if (data.parentId) {
      submitData.parentId = data.parentId;
    }

    if (data.icon && data.icon.trim() !== '') {
      submitData.icon = data.icon.trim();
    }

    if (data.color && data.color.trim() !== '') {
      submitData.color = data.color.trim();
    }

    onSubmit(submitData);
  };

  const categoryTypeOptions = [
    { value: CategoryType.expense, label: t('categories.expense') },
    { value: CategoryType.income, label: t('categories.income') },
    { value: CategoryType.transfer, label: t('categories.transfer') },
    { value: CategoryType.investment, label: t('categories.investment') },
    { value: CategoryType.loan, label: t('categories.loan') },
  ];

  return (
    <CRUDDialog<CategoryTreeResponse, FormValue>
      isOpen={isOpen}
      onClose={onClose}
      item={category}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('categories.addCategory'),
        edit: t('categories.editCategory'),
      }}
      schema={schema}
      defaultValues={defaultValues}
      getFormValues={getFormValues}
      showSaveAndAdd={false}
      size="md"
    >
      {({ control }) => (
        <>
          <ZodFormController
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('categories.name')}
                placeholder={t('categories.namePlaceholder')}
                required
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="type"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('categories.type')}
                placeholder={t('categories.typePlaceholder')}
                required
                error={error}
                items={categoryTypeOptions}
                value={field.value || ''}
                onChange={field.onChange}
                disabled={isEditMode || isAddChildMode}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="parentId"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('categories.parent')}
                placeholder={t('categories.parentPlaceholder')}
                error={error}
                items={parentOptions}
                value={field.value || ''}
                onChange={(value) => field.onChange(value || null)}
                clearable={!isAddChildMode}
                searchable
                disabled={isAddChildMode}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="icon"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('categories.icon')}
                placeholder={t('categories.iconPlaceholder')}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="color"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('categories.color')}
                placeholder={t('categories.colorPlaceholder')}
                error={error}
                {...field}
              />
            )}
          />
        </>
      )}
    </CRUDDialog>
  );
};

export default AddEditCategoryDialog;
