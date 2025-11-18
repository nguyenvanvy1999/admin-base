import type { AggregationFn, CellContext, Row } from '@tanstack/react-table';
import type { ParseKeys } from 'i18next';
import type React from 'react';

export type AccessorFn<T, V = unknown> = (row: T) => V;

export type FilterVariant = 'text' | 'number' | 'select' | 'date';

export type SortingState = { id: string; desc: boolean }[];
export type ColumnFilter = { id: string; value: unknown };

// Nested path type helper - supports up to 4 levels deep (e.g., "user.profile.address.city")
type PathImpl<
  T,
  Key extends keyof T,
  Depth extends readonly unknown[] = [],
> = Key extends string
  ? Depth['length'] extends 4
    ? Key
    : T[Key] extends Record<string, any>
      ? T[Key] extends any[]
        ? Key
        :
            | `${Key}.${PathImpl<
                T[Key],
                Exclude<keyof T[Key], keyof any[]>,
                [...Depth, unknown]
              > &
                string}`
            | `${Key}.${Exclude<keyof T[Key], keyof any[]> & string}`
            | Key
      : Key
  : never;

type PathImpl2<T> = PathImpl<T, keyof T> | keyof T;

export type Path<T> = PathImpl2<T> extends string | keyof T
  ? PathImpl2<T>
  : keyof T;

// Get the value type from a path
export type PathValue<
  T,
  P extends Path<T>,
> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never;

// Improved TypedAccessor - no longer accepts arbitrary strings
export type TypedAccessor<T, V = unknown> = Path<T> | AccessorFn<T, V>;

// Helper type to infer value type from accessor
export type InferAccessorValue<T, A> = A extends keyof T
  ? T[A]
  : A extends Path<T>
    ? PathValue<T, A>
    : A extends AccessorFn<T, infer V>
      ? V
      : unknown;

export type GroupedCellProps<T> = {
  row: Row<T>;
  cell: CellContext<T, unknown>;
};

export type AggregatedCellProps<T> = {
  row: Row<T>;
  cell: CellContext<T, unknown>;
};

export type DataTableAggregationFn<T> = AggregationFn<T> | string;

// Column type variants for better type inference
export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'enum'
  | 'badge'
  | 'array'
  | 'custom';

// Base column properties shared by all column types
interface BaseColumnProps<T> {
  id?: string;
  title?: ParseKeys;
  width?: `${number}rem`;
  minWidth?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
  onClick?: (row: T) => void;
  ellipsis?: boolean;
  cellsStyle?: (row: T) => React.CSSProperties;
  filterVariant?: FilterVariant;
  filterOptions?: { label: string; value: string | number | boolean }[];
  autoFormatDisabled?: boolean;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  aggregationFn?: DataTableAggregationFn<T>;
  GroupedCell?: (props: GroupedCellProps<T>) => React.ReactNode;
  AggregatedCell?: (props: AggregatedCellProps<T>) => React.ReactNode;
}

// Column with typed accessor - value type is inferred
interface DataTableColumnWithAccessor<T, TAccessor> extends BaseColumnProps<T> {
  accessor: TAccessor;
  render?: (
    value: InferAccessorValue<T, TAccessor>,
    row: T,
    rowIndex: number,
  ) => React.ReactNode;
  // Type-specific configurations
  type?: ColumnType;
  // For 'date' type
  dateFormat?: string;
  // For 'number' and 'currency' type
  numberFormat?: {
    decimalScale?: number;
    thousandSeparator?: string;
    prefix?: string;
    suffix?: string;
  };
  // For 'currency' type
  currency?: string | ((row: T) => string | null | undefined);
  // For 'enum' type
  enumConfig?: {
    labelMap: Record<string, string>;
    colorMap?: Record<string, string>;
    defaultColor?: string;
  };
  // For 'badge' type
  badgeConfig?: {
    getLabel: (row: T) => string;
    getColor?: (row: T) => string;
    variant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
  };
  // For 'array' type
  arrayConfig?: {
    getLabel: (item: any) => string;
    variant?: 'badge' | 'chip' | 'text';
    color?: string | ((item: any) => string);
    separator?: string;
  };
  // For 'text' type
  emptyValue?: string;
  emptyStyle?: React.CSSProperties;
  // Legacy format support (deprecated)
  format?: 'date' | 'number' | 'currency' | 'boolean' | 'array' | 'auto';
}

// Column without accessor - only render function
interface DataTableColumnWithoutAccessor<T> extends BaseColumnProps<T> {
  accessor?: never;
  render: (value: undefined, row: T, rowIndex: number) => React.ReactNode;
}

// Union type for all column variants
export type DataTableColumn<T, TAccessor = any> =
  | DataTableColumnWithAccessor<T, TAccessor>
  | DataTableColumnWithoutAccessor<T>;

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
