import type { TransactionDetail } from '@server/dto/transaction.dto';
import dayjs from 'dayjs';

export type DateGroupLevel = 'day' | 'month' | 'year';

export function getDateGroupKey(date: string, level: DateGroupLevel): string {
  if (!date) return '';

  const d = dayjs(date);
  if (!d.isValid()) return '';

  switch (level) {
    case 'day':
      return d.format('YYYY-MM-DD');
    case 'month':
      return d.format('YYYY-MM');
    case 'year':
      return d.format('YYYY');
    default:
      return '';
  }
}

export function dateGroupByDay(row: TransactionDetail): string {
  return getDateGroupKey(row.date, 'day');
}

export function dateGroupByMonth(row: TransactionDetail): string {
  return getDateGroupKey(row.date, 'month');
}

export function dateGroupByYear(row: TransactionDetail): string {
  return getDateGroupKey(row.date, 'year');
}

export function formatDateGroupKey(
  key: string,
  level: DateGroupLevel,
  locale: string = 'en',
): string {
  if (!key) return '';

  try {
    let dateObj: Date;

    switch (level) {
      case 'day':
        dateObj = new Date(key);
        return dateObj.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'month': {
        const [year, month] = key.split('-');
        dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        return dateObj.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
        });
      }
      case 'year':
        return key;
      default:
        return key;
    }
  } catch {
    return key;
  }
}
