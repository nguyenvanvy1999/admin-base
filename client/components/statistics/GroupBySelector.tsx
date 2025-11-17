import { useTranslation } from 'react-i18next';

interface GroupBySelectorProps {
  value: 'day' | 'week' | 'month' | 'year';
  onChange: (value: 'day' | 'week' | 'month' | 'year') => void;
}

export const GroupBySelector = ({ value, onChange }: GroupBySelectorProps) => {
  const { t } = useTranslation();

  const options: Array<{
    value: 'day' | 'week' | 'month' | 'year';
    label: string;
  }> = [
    {
      value: 'day',
      label: t('statistics.groupBy.day', { defaultValue: 'Day' }),
    },
    {
      value: 'week',
      label: t('statistics.groupBy.week', { defaultValue: 'Week' }),
    },
    {
      value: 'month',
      label: t('statistics.groupBy.month', { defaultValue: 'Month' }),
    },
    {
      value: 'year',
      label: t('statistics.groupBy.year', { defaultValue: 'Year' }),
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('statistics.groupBy', { defaultValue: 'Group By' })}:
      </label>
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value as 'day' | 'week' | 'month' | 'year')
        }
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
