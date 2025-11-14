import type { ColumnDef } from '@tanstack/react-table';
import type { ParseKeys } from 'i18next';
import type React from 'react';

export type AccessorFn<T> = (row: T) => unknown;

export type FilterVariant = 'text' | 'number' | 'select' | 'date';

export type SortingState = { id: string; desc: boolean }[];
export type ColumnFilter = { id: string; value: unknown };

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
  GroupedCell?: (props: { row: any }) => React.ReactNode;
  AggregatedCell?: (props: { row: any }) => React.ReactNode;
}

export type MRTColumnDef<T> = ColumnDef<T>;

export interface DataTableProps<T extends { id: string } = { id: string }> {
  columns: DataTableColumn<T>[];
  data?: T[];
  isLoading?: boolean;
  loading?: boolean;
  showIndexColumn?: boolean;
  autoFormatDisabled?: boolean;
  pageSize?: number;
  recordsPerPage?: number;
  pageSizeOptions?: number[];
  recordsPerPageOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  onRecordsPerPageChange?: (size: number) => void;
  recordsPerPageLabel?: string;
  page?: number;
  onPageChange?: (page: number) => void;
  rowCount?: number;
  totalRecords?: number;
  selectedRecords?: T[];
  onSelectedRecordsChange?: (records: T[]) => void;
  pinLastColumn?: boolean;
  height?: string | number;
  storeColumnsKey?: string;
  idAccessor?: keyof T & string;
  sorting?: SortingState;
  onSortingChange?: (
    updater: SortingState | ((prev: SortingState) => SortingState),
  ) => void;
  columnFilters?: ColumnFilter[];
  onColumnFiltersChange?: (updater: ColumnFilter[]) => void;
  enableRowNumbers?: boolean;
  renderTopToolbarCustomActions?: (props: {
    table: unknown;
  }) => React.ReactNode;
  enableGrouping?: boolean;
  grouping?: string[];
  onGroupingChange?: (
    updater: string[] | ((prev: string[]) => string[]),
  ) => void;
  initialGrouping?: string[];
}
