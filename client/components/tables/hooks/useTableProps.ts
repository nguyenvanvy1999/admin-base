import { useMemo } from 'react';
import type { BaseTableProps } from '../commonTypes';
import type { DataTableProps } from '../types';

export type NormalizedTableProps<T extends { id: string }> = {
  isLoading: boolean;
  enableRowNumbers: boolean;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange?: (size: number) => void;
  page: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: DataTableProps<T>['sorting'];
  onSortingChange?: DataTableProps<T>['onSortingChange'];
  columnFilters?: DataTableProps<T>['columnFilters'];
  onColumnFiltersChange?: DataTableProps<T>['onColumnFiltersChange'];
  pinLastColumn?: boolean;
  height?: string | number;
  storeColumnsKey?: string;
  idAccessor?: keyof T & string;
  renderTopToolbarCustomActions?: DataTableProps<T>['renderTopToolbarCustomActions'];
  enableGrouping?: boolean;
  grouping?: string[];
  onGroupingChange?: DataTableProps<T>['onGroupingChange'];
  initialGrouping?: string[];
  autoFormatDisabled?: boolean;
  selectedRecords?: T[];
  onSelectedRecordsChange?: (records: T[]) => void;
};

export function useTableProps<T extends { id: string }>(
  props: BaseTableProps<T>,
): NormalizedTableProps<T> {
  return useMemo(() => {
    const isLoading = props.isLoading ?? props.loading ?? false;
    const enableRowNumbers =
      props.enableRowNumbers ?? props.showIndexColumn ?? true;
    const pageSize = props.recordsPerPage ?? props.pageSize ?? 20;
    const pageSizeOptions =
      props.recordsPerPageOptions ?? props.pageSizeOptions ?? [];
    const page = props.page ?? 1;
    const totalRecords = props.totalRecords ?? props.rowCount;

    const handlePageSizeChange = (size: number) => {
      props.onRecordsPerPageChange?.(size);
      props.onPageSizeChange?.(size);
    };

    return {
      isLoading,
      enableRowNumbers,
      pageSize,
      pageSizeOptions,
      onPageSizeChange:
        props.onRecordsPerPageChange || props.onPageSizeChange
          ? handlePageSizeChange
          : undefined,
      page,
      onPageChange: props.onPageChange,
      totalRecords,
      sorting: props.sorting,
      onSortingChange: props.onSortingChange,
      columnFilters: props.columnFilters,
      onColumnFiltersChange: props.onColumnFiltersChange,
      pinLastColumn: props.pinLastColumn,
      height: props.height,
      storeColumnsKey: props.storeColumnsKey,
      idAccessor: props.idAccessor,
      renderTopToolbarCustomActions: props.renderTopToolbarCustomActions,
      enableGrouping: props.enableGrouping,
      grouping: props.grouping,
      onGroupingChange: props.onGroupingChange,
      initialGrouping: props.initialGrouping,
      autoFormatDisabled: props.autoFormatDisabled,
    };
  }, [
    props.isLoading,
    props.loading,
    props.enableRowNumbers,
    props.showIndexColumn,
    props.recordsPerPage,
    props.pageSize,
    props.recordsPerPageOptions,
    props.pageSizeOptions,
    props.onRecordsPerPageChange,
    props.onPageSizeChange,
    props.page,
    props.onPageChange,
    props.totalRecords,
    props.rowCount,
    props.sorting,
    props.onSortingChange,
    props.columnFilters,
    props.onColumnFiltersChange,
    props.pinLastColumn,
    props.height,
    props.storeColumnsKey,
    props.idAccessor,
    props.renderTopToolbarCustomActions,
    props.enableGrouping,
    props.grouping,
    props.onGroupingChange,
    props.initialGrouping,
    props.autoFormatDisabled,
  ]);
}
