import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { Box, Select } from '@mantine/core';
import type { CategoryType } from '@server/generated/prisma/enums';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { flattenCategories, getCategoryIcon } from './utils/category';

type CategorySelectProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  filterType?: CategoryType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

const CategorySelect = ({
  value,
  onChange,
  onBlur,
  filterType,
  label,
  placeholder,
  required = false,
  error,
  searchable = true,
  clearable = false,
  disabled = false,
}: CategorySelectProps) => {
  const { t } = useTranslation();
  const { data: categoriesData } = useCategoriesQuery({});

  const categoryOptions = useMemo(() => {
    if (!categoriesData?.categories) {
      return [];
    }
    return flattenCategories(categoriesData.categories, t, filterType);
  }, [categoriesData, filterType, t]);

  const selectedCategory = useMemo(() => {
    if (!value || !categoriesData?.categories) return null;

    const findCategory = (
      categories: typeof categoriesData.categories,
    ): (typeof categoriesData.categories)[0] | null => {
      for (const cat of categories) {
        if (cat.id === value) return cat;
        if (cat.children) {
          const found = findCategory(cat.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findCategory(categoriesData.categories);
  }, [value, categoriesData]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return categoryOptions.find((opt) => opt.value === value);
  }, [value, categoryOptions]);

  const IconComponent = selectedCategory
    ? getCategoryIcon(selectedCategory.name)
    : null;

  return (
    <Select
      label={label}
      placeholder={placeholder}
      required={required}
      data={categoryOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        disabled: opt.disabled,
      }))}
      value={value}
      onChange={(val) => {
        onChange(val);
      }}
      onBlur={onBlur}
      error={error}
      searchable={searchable}
      clearable={clearable}
      disabled={disabled}
      leftSection={
        IconComponent && selectedOption ? (
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              pointerEvents: 'none',
            }}
          >
            <IconComponent
              style={{
                fontSize: 18,
                color: selectedOption.color || 'inherit',
                opacity: 0.8,
              }}
            />
            {selectedOption.color && (
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: selectedOption.color,
                }}
              />
            )}
          </Box>
        ) : null
      }
    />
  );
};

export default CategorySelect;
