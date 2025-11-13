import { Box, Group, Stack, Text } from '@mantine/core';
import {
  DatePickerInput,
  type DatePickerInputProps,
  TimeInput,
} from '@mantine/dates';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface DateRangePickerProps
  extends Omit<
    DatePickerInputProps,
    | 'value'
    | 'onChange'
    | 'type'
    | 'presets'
    | 'allowSingleDateInRange'
    | 'styles'
  > {
  value?: {
    from: string | null;
    to: string | null;
  };
  onChange?: (value: { from: string | null; to: string | null }) => void;
  mode?: 'date' | 'datetime';
  label?: string;
  fromLabel?: string;
  toLabel?: string;
  allowSingleDateInRange?: boolean;
  error?: string | boolean;
  required?: boolean;
  maxWidth?: string | number;
  presets?: Array<{
    label: string;
    value: [string, string];
  }>;
}

export const DateRangePicker = ({
  value,
  onChange,
  mode = 'date',
  label,
  fromLabel,
  toLabel,
  allowSingleDateInRange = false,
  error,
  required,
  presets,
  maxWidth = '350px',
  ...datePickerProps
}: DateRangePickerProps) => {
  const { styles: customStyles, ...restDatePickerProps } = datePickerProps as {
    styles?: DatePickerInputProps['styles'];
    [key: string]: any;
  };
  const { t } = useTranslation();
  const [timeFrom, setTimeFrom] = useState<string>('00:00');
  const [timeTo, setTimeTo] = useState<string>('23:59');

  const handleDateChange = (range: [string | null, string | null]) => {
    if (!onChange) return;

    const [from, to] = range;

    if (mode === 'datetime') {
      const fromDateTime = from
        ? dayjs(`${from} ${timeFrom}`).toISOString()
        : null;
      const toDateTime = to ? dayjs(`${to} ${timeTo}`).toISOString() : null;
      onChange({ from: fromDateTime, to: toDateTime });
    } else {
      const fromDate = from ? dayjs(from).startOf('day').toISOString() : null;
      const toDate = to ? dayjs(to).endOf('day').toISOString() : null;
      onChange({ from: fromDate, to: toDate });
    }
  };

  const handleTimeChange = (type: 'from' | 'to', time: string | null) => {
    if (!onChange || !value) return;

    const timeValue = time || (type === 'from' ? '00:00' : '23:59');

    if (type === 'from') {
      setTimeFrom(timeValue);
      const fromDateTime = value.from
        ? dayjs(value.from).format('YYYY-MM-DD') + ` ${timeValue}`
        : null;
      onChange({
        from: fromDateTime ? dayjs(fromDateTime).toISOString() : null,
        to: value.to,
      });
    } else {
      setTimeTo(timeValue);
      const toDateTime = value.to
        ? dayjs(value.to).format('YYYY-MM-DD') + ` ${timeValue}`
        : null;
      onChange({
        from: value.from,
        to: toDateTime ? dayjs(toDateTime).toISOString() : null,
      });
    }
  };

  const handlePresetClick = (presetValue: [string, string]) => {
    if (!onChange) return;

    const [from, to] = presetValue;
    if (mode === 'datetime') {
      onChange({
        from: dayjs(`${from} ${timeFrom}`).toISOString(),
        to: dayjs(`${to} ${timeTo}`).toISOString(),
      });
    } else {
      onChange({
        from: dayjs(from).startOf('day').toISOString(),
        to: dayjs(to).endOf('day').toISOString(),
      });
    }
  };

  const dateValueForPicker: [string | null, string | null] = value
    ? [
        value.from ? dayjs(value.from).format('YYYY-MM-DD') : null,
        value.to ? dayjs(value.to).format('YYYY-MM-DD') : null,
      ]
    : [null, null];

  useEffect(() => {
    if (mode === 'datetime') {
      if (value?.from) {
        const fromTime = dayjs(value.from).format('HH:mm');
        setTimeFrom(fromTime);
      }
      if (value?.to) {
        const toTime = dayjs(value.to).format('HH:mm');
        setTimeTo(toTime);
      }
    }
  }, [value?.from, value?.to, mode]);

  const datePickerInputPresets = presets?.map((preset) => ({
    label: preset.label,
    value: preset.value as [string, string],
  }));

  return (
    <Stack gap="xs">
      {presets && presets.length > 0 && (
        <Group gap="xs">
          {presets.map((preset, index) => (
            <Text
              key={index}
              size="xs"
              c="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handlePresetClick(preset.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePresetClick(preset.value);
                }
              }}
              tabIndex={0}
            >
              {preset.label}
            </Text>
          ))}
        </Group>
      )}

      <DatePickerInput
        type="range"
        label={label}
        placeholder={
          datePickerProps.placeholder ||
          t('common.dateRange', { defaultValue: 'Pick dates range' })
        }
        clearable
        value={dateValueForPicker}
        onChange={handleDateChange}
        allowSingleDateInRange={allowSingleDateInRange}
        error={error}
        required={required}
        presets={datePickerInputPresets}
        style={{
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          width: '100%',
        }}
        styles={{
          input: {
            textAlign: 'center',
          },
          ...customStyles,
        }}
        {...(restDatePickerProps as any)}
      />

      {mode === 'datetime' && (
        <Group gap="md">
          <Box style={{ flex: 1 }}>
            <Text size="xs" mb={4}>
              {fromLabel || t('common.from', { defaultValue: 'From' })}
            </Text>
            <TimeInput
              value={timeFrom}
              onChange={(date) => {
                if (date instanceof Date) {
                  const timeStr = dayjs(date).format('HH:mm');
                  handleTimeChange('from', timeStr);
                } else if (typeof date === 'string') {
                  handleTimeChange('from', date);
                }
              }}
              size="sm"
              disabled={!dateValueForPicker[0]}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <Text size="xs" mb={4}>
              {toLabel || t('common.to', { defaultValue: 'To' })}
            </Text>
            <TimeInput
              value={timeTo}
              onChange={(date) => {
                if (date instanceof Date) {
                  const timeStr = dayjs(date).format('HH:mm');
                  handleTimeChange('to', timeStr);
                } else if (typeof date === 'string') {
                  handleTimeChange('to', date);
                }
              }}
              size="sm"
              disabled={!dateValueForPicker[1]}
            />
          </Box>
        </Group>
      )}

      {error && typeof error === 'string' && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
};
