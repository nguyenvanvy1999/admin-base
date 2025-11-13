import CategoryMultiSelect from '@client/components/CategoryMultiSelect';
import { Select } from '@client/components/Select';
import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useEntitiesOptionsQuery } from '@client/hooks/queries/useEntityQueries';
import { useTranslation } from 'react-i18next';

interface FilterBarProps {
  categoryIds?: string[];
  accountId?: string;
  entityId?: string;
  onCategoryChange?: (categoryIds: string[]) => void;
  onAccountChange?: (accountId: string | null) => void;
  onEntityChange?: (entityId: string | null) => void;
  showCategory?: boolean;
  showAccount?: boolean;
  showEntity?: boolean;
}

export const FilterBar = ({
  categoryIds = [],
  accountId,
  entityId,
  onCategoryChange,
  onAccountChange,
  onEntityChange,
  showCategory = true,
  showAccount = true,
  showEntity = true,
}: FilterBarProps) => {
  const { t } = useTranslation();
  const { data: accountsData } = useAccountsOptionsQuery();
  const { data: entitiesData } = useEntitiesOptionsQuery();

  const accountOptions =
    accountsData?.accounts?.map((acc) => ({
      label: acc.name,
      value: acc.id,
    })) || [];

  const entityOptions =
    entitiesData?.entities?.map((ent) => ({
      label: ent.name,
      value: ent.id,
    })) || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {showCategory && onCategoryChange && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('statistics.filterByCategory', {
                defaultValue: 'Filter by Category',
              })}
            </label>
            <CategoryMultiSelect
              value={categoryIds}
              onChange={onCategoryChange}
              placeholder={t('statistics.selectCategories', {
                defaultValue: 'Select categories',
              })}
              clearable
            />
          </div>
        )}
        {showAccount && onAccountChange && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('statistics.filterByAccount', {
                defaultValue: 'Filter by Account',
              })}
            </label>
            <Select
              items={accountOptions}
              value={accountId || null}
              onChange={(value) => onAccountChange(value)}
              placeholder={t('statistics.selectAccount', {
                defaultValue: 'Select account',
              })}
              searchable
              clearable
            />
          </div>
        )}
        {showEntity && onEntityChange && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('statistics.filterByEntity', {
                defaultValue: 'Filter by Entity',
              })}
            </label>
            <Select
              items={entityOptions}
              value={entityId || null}
              onChange={(value) => onEntityChange(value)}
              placeholder={t('statistics.selectEntity', {
                defaultValue: 'Select entity',
              })}
              searchable
              clearable
            />
          </div>
        )}
      </div>
    </div>
  );
};
