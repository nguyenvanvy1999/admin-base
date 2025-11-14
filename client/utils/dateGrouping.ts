import type { TransactionDetail } from '@server/dto/transaction.dto';

export type DateGroupLevel = 'day' | 'month' | 'year';

export function getDateGroupKey(date: string, level: DateGroupLevel): string {
  if (!date) return '';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  switch (level) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'month':
      return `${year}-${month}`;
    case 'year':
      return String(year);
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
