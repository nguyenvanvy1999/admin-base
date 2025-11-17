import type { DateGroupLevel } from '@client/utils/dateGrouping';
import { formatDateGroupKey } from '@client/utils/dateGrouping';
import { Box, Group, Select } from '@mantine/core';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupedCellProps } from './types';

export type GroupingLevel = DateGroupLevel | 'none';

export type DateGroupingConfig<T> = {
  accessor: (row: T) => string;
  groupingLevel: GroupingLevel;
  language?: string;
  enableGrouping: boolean;
  GroupedCell?: (props: GroupedCellProps<T>) => React.ReactNode;
};

export function useTableGrouping(initialLevel: GroupingLevel = 'none') {
  const [groupingLevel, setGroupingLevel] =
    useState<GroupingLevel>(initialLevel);

  const grouping = useMemo(() => {
    if (groupingLevel === 'none') return [];
    return ['date'];
  }, [groupingLevel]);

  const enableGrouping = groupingLevel !== 'none';

  return {
    groupingLevel,
    setGroupingLevel,
    grouping,
    enableGrouping,
  };
}

export function createDateGroupingConfig<T extends { date: string }>(
  groupingLevel: GroupingLevel,
  dateAccessor: (row: T) => string,
  language: string = 'en',
): DateGroupingConfig<T> {
  const enableGrouping = groupingLevel !== 'none';

  return {
    accessor: dateAccessor,
    groupingLevel,
    language,
    enableGrouping,
    GroupedCell: enableGrouping
      ? ({ row, cell }: GroupedCellProps<T>) => {
          const groupValue = cell.getValue() as string;
          const formatted = formatDateGroupKey(
            groupValue,
            groupingLevel as DateGroupLevel,
            language,
          );
          const count = row.subRows?.length || 0;
          return (
            <Box
              style={{
                color: 'var(--mantine-color-blue-6)',
                fontWeight: 'bold',
              }}
            >
              <strong>{formatted}</strong> ({count})
            </Box>
          );
        }
      : undefined,
  };
}

export type GroupingSelectorProps = {
  value: GroupingLevel;
  onChange: (value: GroupingLevel) => void;
  options?: Array<{ value: GroupingLevel; label: string }>;
};

export function GroupingSelector({
  value,
  onChange,
  options,
}: GroupingSelectorProps) {
  const { t } = useTranslation();

  const defaultOptions = useMemo(
    () => [
      {
        value: 'none' as GroupingLevel,
        label: t('transactions.noGrouping', { defaultValue: 'No Grouping' }),
      },
      {
        value: 'day' as GroupingLevel,
        label: t('transactions.groupByDay', { defaultValue: 'Day' }),
      },
      {
        value: 'month' as GroupingLevel,
        label: t('transactions.groupByMonth', { defaultValue: 'Month' }),
      },
      {
        value: 'year' as GroupingLevel,
        label: t('transactions.groupByYear', { defaultValue: 'Year' }),
      },
    ],
    [t],
  );

  return (
    <Group mb="md">
      <Select
        label={t('transactions.groupBy', { defaultValue: 'Group by' })}
        value={value}
        onChange={(val) => onChange((val as GroupingLevel) || 'none')}
        data={options || defaultOptions}
        style={{ maxWidth: '200px' }}
      />
    </Group>
  );
}

export function createDateAccessor<T extends { date: string }>(
  groupingLevel: GroupingLevel,
  dateField: keyof T = 'date' as keyof T,
) {
  return useCallback(
    (row: T): string => {
      const dateValue = row[dateField] as string;
      if (!dateValue) return '';

      switch (groupingLevel) {
        case 'day':
          return getDateGroupKey(dateValue, 'day');
        case 'month':
          return getDateGroupKey(dateValue, 'month');
        case 'year':
          return getDateGroupKey(dateValue, 'year');
        default:
          return dateValue;
      }
    },
    [groupingLevel, dateField],
  );
}

function getDateGroupKey(date: string, level: DateGroupLevel): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    switch (level) {
      case 'day':
        return d.toISOString().split('T')[0];
      case 'month': {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      }
      case 'year':
        return String(d.getFullYear());
      default:
        return date;
    }
  } catch {
    return date;
  }
}
