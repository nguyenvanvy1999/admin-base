import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { Box, MultiSelect } from '@mantine/core';
import type { CategoryType } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { flattenCategories, getCategoryIcon } from './utils/category';

type CategoryMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  filterType?: CategoryType;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: React.ReactNode;
  style?: React.CSSProperties;
};

const CategoryMultiSelect = ({
  value,
  onChange,
  filterType,
  placeholder,
  searchable = true,
  clearable = false,
  disabled = false,
  error,
  style,
}: CategoryMultiSelectProps) => {
  const { t } = useTranslation();
  const { data: categoriesData } = useCategoriesQuery({});

  const categoryOptions = useMemo(() => {
    if (!categoriesData?.categories) {
      return [];
    }
    return flattenCategories(categoriesData.categories, t, filterType);
  }, [categoriesData, filterType, t]);

  const data = useMemo(() => {
    return categoryOptions.map((opt) => ({
      value: opt.value,
      label: opt.label.trim(),
      icon: opt.icon,
      color: opt.color,
    }));
  }, [categoryOptions]);

  return (
    <MultiSelect
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data={data.map((item) => ({
        value: item.value,
        label: item.label,
      }))}
      searchable={searchable}
      clearable={clearable}
      disabled={disabled}
      error={error}
      style={style}
      renderOption={({ option }) => {
        const item = data.find((d) => d.value === option.value);
        if (!item) return <span>{option.label}</span>;

        const IconComponent = item.icon ? getCategoryIcon(item.icon) : null;

        return (
          <div className="flex items-center gap-2">
            {IconComponent && (
              <IconComponent
                style={{
                  fontSize: 18,
                  color: item.color || 'inherit',
                  opacity: 0.8,
                }}
              />
            )}
            {item.color && (
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                }}
              />
            )}
            <span>{item.label}</span>
          </div>
        );
      }}
    />
  );
};

export default CategoryMultiSelect;
