import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';
import i18n from '@client/i18n';
import numeral from 'numeral';

const getCurrentLocale = () => {
  const lang = i18n.language || 'vi';
  return lang === 'en' ? 'en' : 'vi';
};

const initFormatters = () => {
  const locale = getCurrentLocale();
  dayjs.locale(locale === 'en' ? 'en' : 'vi');
};

initFormatters();

i18n.on('languageChanged', () => {
  initFormatters();
});

export const formatDate = (
  value: string | Date | null | undefined,
  format?: string,
): string => {
  if (!value) return '-';

  const date = dayjs(value);
  if (!date.isValid()) return '-';

  if (format) {
    return date.format(format);
  }

  const locale = getCurrentLocale();
  if (locale === 'vi') {
    return date.format('DD/MM/YYYY HH:mm');
  }
  return date.format('MM/DD/YYYY HH:mm');
};

export const formatInt = (
  value: number | string | null | undefined,
): string => {
  if (value === null || value === undefined) return '-';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  return numeral(num).format('0,0');
};

export const formatDecimal = (
  value: number | string | null | undefined,
  decimalPlaces: number = 2,
): string => {
  if (value === null || value === undefined) return '-';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  const format = `0,0.${'0'.repeat(decimalPlaces)}`;
  return numeral(num).format(format);
};
