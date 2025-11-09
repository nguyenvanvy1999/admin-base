import type { ColumnDef } from '@tanstack/react-table';
import type { ParseKeys } from 'i18next';

export type DataTableColumn<T> = Omit<
  ColumnDef<T>,
  'header' | 'accessor' | 'cell'
> & {
  title?: ParseKeys | string;
  accessor?: string | ((row: T) => any);
  format?: 'date' | 'number' | 'currency' | 'boolean' | 'array' | 'auto';
  currency?: string | ((row: T) => string | null | undefined);
  dateFormat?: string;
  numberFormat?: {
    decimalScale?: number;
    thousandSeparator?: string;
    prefix?: string;
    suffix?: string;
  };
  render?: (value: any, row: T, index: number) => React.ReactNode;
  onClick?: (row: T) => void;
  ellipsis?: boolean;
  minWidth?: `${number}rem`;
  width?: `${number}rem`;
  autoFormatDisabled?: boolean;
};

export type ColumnOrderConfig = {
  storeKey: string;
  defaultOrder?: string[];
};

export type DataTableColumnConfig<T> = {
  columns: DataTableColumn<T>[];
  orderConfig?: ColumnOrderConfig;
  showIndexColumn?: boolean;
  autoFormatDisabled?: boolean;
};
