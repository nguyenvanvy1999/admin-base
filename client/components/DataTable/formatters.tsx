import { NumberFormatter } from '@mantine/core';

export type FormatOptions = {
  format?: 'date' | 'number' | 'currency' | 'boolean' | 'array' | 'auto';
  currency?: string | null;
  dateFormat?: string;
  numberFormat?: {
    decimalScale?: number;
    thousandSeparator?: string;
    prefix?: string;
    suffix?: string;
  };
  autoFormatDisabled?: boolean;
};

export const formatDate = (
  value: string | Date | null | undefined,
  format?: string,
): string => {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '-';

  if (format) {
    const options: Intl.DateTimeFormatOptions = {
      year: format.includes('YYYY') ? 'numeric' : undefined,
      month: format.includes('MM') ? '2-digit' : undefined,
      day: format.includes('DD') ? '2-digit' : undefined,
      hour: format.includes('HH') ? '2-digit' : undefined,
      minute: format.includes('mm') ? '2-digit' : undefined,
    };
    return new Intl.DateTimeFormat('vi-VN', options).format(date);
  }

  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatNumber = (
  value: number | string | null | undefined,
  options?: FormatOptions['numberFormat'],
): string => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: options?.decimalScale ?? 2,
    maximumFractionDigits: options?.decimalScale ?? 2,
  });
};

export const formatCurrency = (
  value: number | string | null | undefined,
  currency?: string | null,
  options?: FormatOptions['numberFormat'],
): React.ReactNode => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  const prefix = currency ? `${currency} ` : options?.prefix || '';
  const suffix = options?.suffix || '';

  return (
    <NumberFormatter
      value={num}
      prefix={prefix}
      suffix={suffix}
      thousandSeparator={options?.thousandSeparator || ','}
      decimalScale={options?.decimalScale ?? 2}
    />
  );
};

export const formatBoolean = (
  value: boolean | null | undefined,
  trueLabel?: string,
  falseLabel?: string,
): string => {
  if (value === null || value === undefined) return '-';
  if (value === true) return trueLabel || 'Yes';
  return falseLabel || 'No';
};

export const formatArray = (
  value: any[] | null | undefined,
  separator = ', ',
): string => {
  if (!value || !Array.isArray(value)) return '-';
  if (value.length === 0) return '-';
  return value
    .filter((item) => item !== null && item !== undefined)
    .map((item) => String(item))
    .join(separator);
};

export const defaultColumnRender = (
  value: any,
  options?: FormatOptions,
): React.ReactNode => {
  if (options?.autoFormatDisabled) {
    return value === null || value === undefined ? '-' : String(value);
  }

  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-500 dark:text-gray-400">-</span>;
  }

  if (options?.format === 'date' || value instanceof Date) {
    return (
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {formatDate(value, options?.dateFormat)}
      </span>
    );
  }

  if (options?.format === 'currency' || options?.currency) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(num)) {
      return (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatCurrency(num, options.currency, options.numberFormat)}
        </span>
      );
    }
  }

  if (options?.format === 'number' || typeof value === 'number') {
    return (
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {formatNumber(value, options?.numberFormat)}
      </span>
    );
  }

  if (options?.format === 'boolean' || typeof value === 'boolean') {
    return (
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {formatBoolean(value)}
      </span>
    );
  }

  if (options?.format === 'array' || Array.isArray(value)) {
    return (
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {formatArray(value)}
      </span>
    );
  }

  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num) && !options?.autoFormatDisabled) {
      if (value.includes('.')) {
        return (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {formatNumber(num, options?.numberFormat)}
          </span>
        );
      }
    }
    return (
      <span className="text-sm text-gray-900 dark:text-gray-100">{value}</span>
    );
  }

  if (typeof value === 'object') {
    try {
      return (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {JSON.stringify(value)}
        </span>
      );
    } catch {
      return (
        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
      );
    }
  }

  return (
    <span className="text-sm text-gray-900 dark:text-gray-100">
      {String(value)}
    </span>
  );
};
