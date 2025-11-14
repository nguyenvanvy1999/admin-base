import type { ParseKeys } from 'i18next';
import type React from 'react';

export type AccessorFn<T> = (row: T) => unknown;

export type FilterVariant = 'text' | 'number' | 'select' | 'date';

export interface DataTableColumn<T> {
  title?: ParseKeys;
  accessor?: string | AccessorFn<T>;
  render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
  width?: `${number}rem`;
  minWidth?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
  onClick?: (row: T) => void;
  ellipsis?: boolean;
  cellsStyle?: (row: T) => React.CSSProperties;
  filterVariant?: FilterVariant;
  filterOptions?: { label: string; value: string | number | boolean }[];
  format?: 'date' | 'number' | 'currency' | 'boolean' | 'array' | 'auto';
  currency?: string | ((row: T) => string | null | undefined);
  dateFormat?: string;
  numberFormat?: {
    decimalScale?: number;
    thousandSeparator?: string;
    prefix?: string;
    suffix?: string;
  };
  autoFormatDisabled?: boolean;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  aggregationFn?: string;
  GroupedCell?: (props: any) => React.ReactNode;
  AggregatedCell?: (props: any) => React.ReactNode;
}
