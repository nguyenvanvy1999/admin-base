import type React from 'react';
import type { DataTableColumn, SortingState } from './types';

export type BaseTableProps<_T extends { id: string }> = {
  isLoading?: boolean;
  loading?: boolean;
  showIndexColumn?: boolean;
  enableRowNumbers?: boolean;
  recordsPerPage?: number;
  pageSize?: number;
  recordsPerPageOptions?: number[];
  pageSizeOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  onPageSizeChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  rowCount?: number;
  sorting?: SortingState;
  onSortingChange?: (
    updater: SortingState | ((prev: SortingState) => SortingState),
  ) => void;
  columnFilters?: { id: string; value: unknown }[];
  onColumnFiltersChange?: (updater: { id: string; value: unknown }[]) => void;
  pinLastColumn?: boolean;
  height?: string | number;
  storeColumnsKey?: string;
  idAccessor?: keyof _T & string;
  renderTopToolbarCustomActions?: (props: {
    table: unknown;
  }) => React.ReactNode;
  enableGrouping?: boolean;
  grouping?: string[];
  onGroupingChange?: (
    updater: string[] | ((prev: string[]) => string[]),
  ) => void;
  initialGrouping?: string[];
  autoFormatDisabled?: boolean;
};

export type ActionTableProps<T extends { id: string }> = BaseTableProps<T> & {
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  onView?: (row: T) => void;
};

export type SelectableTableProps<T extends { id: string }> =
  BaseTableProps<T> & {
    selectedRecords?: T[];
    onSelectedRecordsChange?: (records: T[]) => void;
    onDeleteMany?: (ids: string[]) => void;
  };

export type ActionSelectableTableProps<T extends { id: string }> =
  ActionTableProps<T> & SelectableTableProps<T>;

export type ColumnFactoryOptions<T extends { id: string }> = {
  id?: string;
  title?: DataTableColumn<T>['title'];
  accessor?: DataTableColumn<T>['accessor'];
  enableSorting?: boolean;
  enableGrouping?: boolean;
  width?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  aggregationFn?: DataTableColumn<T>['aggregationFn'];
  AggregatedCell?: DataTableColumn<T>['AggregatedCell'];
  onClick?: DataTableColumn<T>['onClick'];
  cellsStyle?: DataTableColumn<T>['cellsStyle'];
};
