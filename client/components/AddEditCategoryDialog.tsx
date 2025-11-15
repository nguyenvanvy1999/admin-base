import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { Modal, Stack, TextInput } from '@mantine/core';
import {
  type CategoryTreeResponse,
  type IUpsertCategoryDto,
  UpsertCategoryDto,
} from '@server/dto/category.dto';
import { CategoryType } from '@server/generated';
import type { TFunction } from 'i18next';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DialogFooterButtons } from './DialogFooterButtons';
import { Select } from './Select';
import { ZodFormController } from './ZodFormController';

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

    const excludeId = isEditMode && category ? category.id : undefined;
    return flattenCategories(categoriesData.categories, t, excludeId, 0, true);
  }, [categoriesData, isEditMode, category, t]);

  const defaultValues: FormValue = {
    name: '',
    type: CategoryType.expense,
    parentId: null,
    icon: '',
    color: '',
  };

  const { control, handleSubmit, reset } = useZodForm({
    zod: schema,
    defaultValues,
  });

  useEffect(() => {
    if (category) {
      reset({
        id: category.id,
        name: category.name,
        type: category.type,
        parentId: category.parentId,
        icon: category.icon || '',
        color: category.color || '',
      });
    } else if (parentId !== undefined && parentId !== null) {
      reset({
        ...defaultValues,
        parentId: parentId,
        type: parentType || CategoryType.expense,
      });
    } else {
      reset(defaultValues);
    }
  }, [category, parentId, parentType, isOpen, reset]);

  const onSubmitForm = handleSubmit((data) => {
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
  });

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
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
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

          <DialogFooterButtons
            isEditMode={isEditMode}
            isLoading={isLoading}
            onCancel={onClose}
            onSave={onSubmitForm}
            showSaveAndAdd={false}
          />
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditCategoryDialog;
