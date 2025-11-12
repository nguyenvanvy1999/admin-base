import type { ParseKeys } from 'i18next';
import type React from 'react';

export type AccessorFn<T> = (row: T) => unknown;

export type FilterVariant = 'text' | 'number' | 'select' | 'date';

export interface DataTableColumn<T> {
  // Header title i18n key
  title?: ParseKeys;
  // Accessor: either string key or function
  accessor?: string | AccessorFn<T>;
  // Custom cell render overrides auto format
  render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
  // Width constraints (rem-based to keep current API)
  width?: `${number}rem`;
  minWidth?: `${number}rem`;
  // Text alignment
  textAlign?: 'left' | 'center' | 'right';
  // Row click handler for this column (if cell is clicked)
  onClick?: (row: T) => void;
  // Optional text overflow ellipsis for long text cells
  ellipsis?: boolean;
  // Optional per-row style for this column's cell
  cellsStyle?: (row: T) => React.CSSProperties;
  // Optional filter UI hint for server filtering
  filterVariant?: FilterVariant;
  // For select filter, provide options
  filterOptions?: { label: string; value: string | number | boolean }[];
  // Format options for auto-formatting
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
  // Enable/disable sorting for this column
  enableSorting?: boolean;
}
