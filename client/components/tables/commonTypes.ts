import type { DataTableColumn } from './types';

export type BaseTableProps<_T extends { id: string }> = {
  isLoading?: boolean;
  showIndexColumn?: boolean;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: { id: string; desc: boolean }[];
  onSortingChange?: (
    updater:
      | { id: string; desc: boolean }[]
      | ((prev: { id: string; desc: boolean }[]) => {
          id: string;
          desc: boolean;
        }[]),
  ) => void;
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
