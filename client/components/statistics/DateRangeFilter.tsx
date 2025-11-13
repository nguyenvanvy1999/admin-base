import { DateRangePicker } from '@client/components';
import { Box } from '@mantine/core';
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

  const dateRangePickerPresets = defaultPresets.map((preset) => {
    const { from, to } = preset.getValue();
    return {
      label: preset.label,
      value: [
        dayjs(from).format('YYYY-MM-DD'),
        dayjs(to).format('YYYY-MM-DD'),
      ] as [string, string],
    };
  });

  return (
    <Box className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <DateRangePicker
        value={{ from: dateFrom, to: dateTo }}
        onChange={(range) => {
          if (range.from) {
            onChange('from', range.from);
          }
          if (range.to) {
            onChange('to', range.to);
          }
        }}
        mode="date"
        presets={dateRangePickerPresets}
      />
    </Box>
  );
};
