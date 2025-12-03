import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

export function useSessionDateRange(defaultDays = 7) {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const end = dayjs();
    const start = end.subtract(defaultDays, 'day');
    return [start, end];
  });

  const created0 = useMemo(() => {
    const start = dayjs(dateRange[0]);
    return start.startOf('day').toISOString();
  }, [dateRange]);

  const created1 = useMemo(() => {
    const end = dayjs(dateRange[1]);
    return end.endOf('day').toISOString();
  }, [dateRange]);

  const resetDateRange = () => {
    const end = dayjs();
    const start = end.subtract(defaultDays, 'day');
    setDateRange([start, end]);
  };

  return {
    dateRange,
    setDateRange,
    created0,
    created1,
    resetDateRange,
  };
}
