import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (type: 'from' | 'to', value: string) => void;
  presets?: Array<{
    label: string;
    getValue: () => { from: string; to: string };
  }>;
}

export const DateRangeFilter = ({
  dateFrom,
  dateTo,
  onChange,
  presets,
}: DateRangeFilterProps) => {
  const { t } = useTranslation();

  const defaultPresets = presets || [
    {
      label: t('statistics.today', { defaultValue: 'Today' }),
      getValue: () => ({
        from: dayjs().startOf('day').toISOString(),
        to: dayjs().endOf('day').toISOString(),
      }),
    },
    {
      label: t('statistics.thisWeek', { defaultValue: 'This Week' }),
      getValue: () => ({
        from: dayjs().startOf('week').toISOString(),
        to: dayjs().endOf('week').toISOString(),
      }),
    },
    {
      label: t('statistics.thisMonth', { defaultValue: 'This Month' }),
      getValue: () => ({
        from: dayjs().startOf('month').toISOString(),
        to: dayjs().endOf('month').toISOString(),
      }),
    },
    {
      label: t('statistics.thisYear', { defaultValue: 'This Year' }),
      getValue: () => ({
        from: dayjs().startOf('year').toISOString(),
        to: dayjs().endOf('year').toISOString(),
      }),
    },
    {
      label: t('statistics.lastMonth', { defaultValue: 'Last Month' }),
      getValue: () => ({
        from: dayjs().subtract(1, 'month').startOf('month').toISOString(),
        to: dayjs().subtract(1, 'month').endOf('month').toISOString(),
      }),
    },
    {
      label: t('statistics.last3Months', { defaultValue: 'Last 3 Months' }),
      getValue: () => ({
        from: dayjs().subtract(3, 'month').startOf('month').toISOString(),
        to: dayjs().endOf('month').toISOString(),
      }),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {defaultPresets.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                const { from, to } = preset.getValue();
                onChange('from', from);
                onChange('to', to);
              }}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('statistics.from', { defaultValue: 'From' })}
            </label>
            <input
              type="date"
              value={dayjs(dateFrom).format('YYYY-MM-DD')}
              onChange={(e) =>
                onChange('from', dayjs(e.target.value).toISOString())
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('statistics.to', { defaultValue: 'To' })}
            </label>
            <input
              type="date"
              value={dayjs(dateTo).format('YYYY-MM-DD')}
              onChange={(e) =>
                onChange('to', dayjs(e.target.value).toISOString())
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
