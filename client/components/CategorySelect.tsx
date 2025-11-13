import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { Box, Select } from '@mantine/core';
import type { CategoryTreeResponse } from '@server/dto/category.dto';
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
  categories?: CategoryTreeResponse[];
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
  categories: categoriesProp,
}: CategorySelectProps) => {
  const { t } = useTranslation();
  const { data: categoriesData } = useCategoriesQuery(
    {},
    {
      enabled: !categoriesProp,
    },
  );

  const categories = categoriesProp || categoriesData?.categories || [];

  const categoryOptions = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [];
    }
    return flattenCategories(categories, t, filterType);
  }, [categories, filterType, t]);

  const selectedCategory = useMemo(() => {
    if (!value || !categories || categories.length === 0) return null;

    const findCategory = (
      cats: typeof categories,
    ): (typeof categories)[0] | null => {
      for (const cat of cats) {
        if (cat.id === value) return cat;
        if (cat.children) {
          const found = findCategory(cat.children as typeof categories);
          if (found) return found;
        }
      }
      return null;
    };

    return findCategory(categories);
  }, [value, categories]);

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
