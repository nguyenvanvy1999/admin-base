import { useEventsOptionsQuery } from '@client/hooks/queries/useEventQueries';
import { Select } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type EventSelectProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

const EventSelect = ({
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  required = false,
  error,
  searchable = true,
  clearable = false,
  disabled = false,
}: EventSelectProps) => {
  const { t } = useTranslation();
  const { data: eventsData } = useEventsOptionsQuery();

  const eventOptions = useMemo(() => {
    if (!eventsData?.events || eventsData.events.length === 0) {
      return [];
    }
    return eventsData.events.map((event) => ({
      value: event.id,
      label: event.name,
    }));
  }, [eventsData]);

  const displayLabel =
    label === ''
      ? undefined
      : label || t('transactions.event', { defaultValue: 'Event' });

  return (
    <Select
      label={displayLabel}
      placeholder={
        placeholder ||
        t('transactions.eventPlaceholder', { defaultValue: 'Select event' })
      }
      required={required}
      data={eventOptions}
      value={value}
      onChange={(val) => {
        onChange(val);
      }}
      onBlur={onBlur}
      error={error}
      searchable={searchable}
      clearable={clearable}
      disabled={disabled}
    />
  );
};

export default EventSelect;
