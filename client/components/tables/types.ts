import type { AggregationFn, CellContext, Row } from '@tanstack/react-table';
import type { ParseKeys } from 'i18next';
import type React from 'react';

export type AccessorFn<T, V = unknown> = (row: T) => V;

export type FilterVariant = 'text' | 'number' | 'select' | 'date';

export type SortingState = { id: string; desc: boolean }[];
export type ColumnFilter = { id: string; value: unknown };

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

export type TypedAccessor<T, V = unknown> = Path<T> | AccessorFn<T, V>;

export type InferAccessorValue<T, TAccessor> = TAccessor extends keyof T
  ? T[TAccessor]
  : TAccessor extends Path<T>
    ? PathValue<T, TAccessor>
    : TAccessor extends AccessorFn<T, infer V>
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

interface BaseColumnProps<TData extends { id: string }> {
  id?: string;
  title?: ParseKeys;
  width?: `${number}rem`;
  minWidth?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
  onClick?: (row: TData) => void;
  ellipsis?: boolean;
  cellsStyle?: (row: TData) => React.CSSProperties;
  filterVariant?: FilterVariant;
  filterOptions?: { label: string; value: string | number | boolean }[];
  autoFormatDisabled?: boolean;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  aggregationFn?: DataTableAggregationFn<TData>;
  GroupedCell?: (props: GroupedCellProps<TData>) => React.ReactNode;
  AggregatedCell?: (props: AggregatedCellProps<TData>) => React.ReactNode;
}

interface DataTableColumnWithAccessor<
  TData extends { id: string },
  TAccessor extends TypedAccessor<TData, any>,
> extends BaseColumnProps<TData> {
  accessor: TAccessor;
  render?: (props: {
    value: InferAccessorValue<TData, TAccessor>;
    row: TData;
    rowIndex: number;
  }) => React.ReactNode;
  format?: 'date' | 'number' | 'currency' | 'boolean' | 'array' | 'auto';
  currency?: string | ((row: TData) => string | null | undefined);
  dateFormat?: string;
  numberFormat?: {
    decimalScale?: number;
    thousandSeparator?: string;
    prefix?: string;
    suffix?: string;
  };
}

interface DataTableColumnWithoutAccessor<TData extends { id: string }>
  extends BaseColumnProps<TData> {
  accessor?: never;
  render: (props: { row: TData; rowIndex: number }) => React.ReactNode;
}

export type DataTableColumn<TData extends { id: string }> =
  | DataTableColumnWithAccessor<TData, TypedAccessor<TData, any>>
  | DataTableColumnWithoutAccessor<TData>;

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
