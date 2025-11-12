import { booleanStatusMap } from '@client/utils/booleanStatusMap';
import {
  MantineReactTable,
  useMantineReactTable,
} from 'mantine-react-table-open';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnOrdering } from './DataTable/ColumnOrdering';
import type { DataTableColumn } from './DataTable/types';
import { MetaVisualizer } from './MetaVisualizer';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

type SortingState = { id: string; desc: boolean }[];
type ColumnFilter = { id: string; value: unknown };

type Props<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  showIndexColumn?: boolean;
  autoFormatDisabled?: boolean;
  // pagination (server)
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  recordsPerPageLabel?: string;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  // selection
  selectedRecords?: T[];
  onSelectedRecordsChange?: (records: T[]) => void;
  // misc
  pinLastColumn?: boolean;
  height?: string | number;
  storeColumnsKey?: string;
  idAccessor?: keyof T & string;
  // server sorting/filtering (optional)
  sorting?: SortingState;
  onSortingChange?: (updater: SortingState) => void;
  columnFilters?: ColumnFilter[];
  onColumnFiltersChange?: (updater: ColumnFilter[]) => void;
};

export function DataTable<T extends { id: string } = { id: string }>({
  idAccessor = 'id',
  columns,
  data,
  loading,
  showIndexColumn,
  pinLastColumn,
  height,
  selectedRecords,
  onSelectedRecordsChange,
  storeColumnsKey,
  autoFormatDisabled,
  recordsPerPage,
  recordsPerPageOptions,
  onRecordsPerPageChange,
  page,
  onPageChange,
  totalRecords,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  ...props
}: Props<T>) {
  const { t } = useTranslation();

  const autoFormat = (value: any): any => {
    if (value instanceof Date) {
      return t('common.date', { value });
    }

    if (value === null || value === undefined) {
      return null;
    }

    const valueType = typeof value;

    if (valueType === 'boolean') {
      return (
        <MetaVisualizer
          k={String(value) as 'true' | 'false'}
          map={booleanStatusMap}
        />
      );
    }

    if (valueType === 'object') {
      if (Array.isArray(value)) {
        if (value.every((item) => typeof item === 'string')) {
          return value.join(', ');
        }
      }
      return JSON.stringify(value);
    }

    if (valueType === 'string') {
      if (ISO_DATE_REGEX.test(value)) {
        return t('common.date', { value });
      }
      if (value !== '' && Number.isFinite(+value) && !autoFormatDisabled) {
        return value.includes('.')
          ? t('common.decimal', { value: +value })
          : t('common.int', { value: +value });
      }
    }

    if (valueType === 'number' && !autoFormatDisabled) {
      return Number.isInteger(value)
        ? t('common.int', { value })
        : t('common.decimal', { value });
    }

    return value;
  };

  // map our column defs to MRT v2 column definitions
  const mappedColumns = useMemo(() => {
    const toPx = (rem?: string) => {
      if (!rem) return undefined;
      const num = parseFloat(rem.replace('rem', ''));
      return Number.isFinite(num) ? Math.round(num * 16) : undefined;
    };

    const baseCols = columns.map((col, idx) => {
      const hasAccessorFn = typeof col.accessor === 'function';
      const accessorKey =
        col.accessor && typeof col.accessor === 'string'
          ? (col.accessor as string)
          : undefined;
      const id =
        accessorKey ||
        (col.title ? String(col.title) : undefined) ||
        `col_${idx}`;

      return {
        id,
        header: col.title ? t(col.title) : '',
        accessorKey,
        accessorFn: hasAccessorFn
          ? (row: T) => (col.accessor as (r: T) => unknown)(row)
          : undefined,
        Cell: ({ row, cell }: any) => {
          const record = row.original as T;
          const value = cell.getValue();
          let content: any;
          if (col.render) {
            content = col.render(record, row.index);
          } else if (!autoFormatDisabled) {
            content =
              typeof col.accessor === 'function'
                ? autoFormat((col.accessor as (r: T) => unknown)(record))
                : autoFormat(value);
          } else {
            content = value;
          }
          const style: React.CSSProperties = {
            ...(col.textAlign && col.textAlign !== 'left'
              ? { textAlign: col.textAlign }
              : undefined),
            ...(col.ellipsis
              ? {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  display: 'inline-block',
                }
              : undefined),
            ...(col.cellsStyle ? col.cellsStyle(record) : undefined),
          };
          return (
            <span
              role={col.onClick ? 'button' : undefined}
              style={{
                cursor: col.onClick ? 'pointer' : undefined,
                display: 'inline-block',
                width: '100%',
                ...style,
              }}
              onClick={col.onClick ? () => col.onClick?.(record) : undefined}
            >
              {content}
            </span>
          );
        },
        size: toPx(col.width),
        minSize: toPx(col.minWidth),
        // text align/ellipsis/styles handled in Cell wrapper above
        // filter UI hints (MRT will be manual filtering if wired)
        filterVariant: col.filterVariant,
        filterSelectOptions: col.filterOptions,
      };
    });

    if (showIndexColumn) {
      baseCols.unshift({
        id: '_index',
        header: '#',
        accessorFn: () => '',
        size: 64,
        mantineTableBodyCellProps: { style: { textAlign: 'center' } },
        Cell: ({ row }: any) => {
          // page-based numbering if page/pageSize provided
          const indexInPage = row.index;
          const start =
            recordsPerPage && page ? (page - 1) * recordsPerPage : 0;
          return start + indexInPage + 1;
        },
      } as any);
    }

    return baseCols as any[];
  }, [columns, t, showIndexColumn, autoFormatDisabled, recordsPerPage, page]);

  const [orderedColumns, setOrderedColumns] = useState(mappedColumns);

  useEffect(() => {
    setOrderedColumns(mappedColumns);
  }, [mappedColumns]);

  // selection state mapping
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (selectedRecords && onSelectedRecordsChange) {
      // keep controlled parity if needed
      const map: Record<string, boolean> = {};
      selectedRecords.forEach((r) => {
        const id = (r as any)[idAccessor];
        if (id) map[String(id)] = true;
      });
      setRowSelection(map);
    }
  }, [selectedRecords, onSelectedRecordsChange, idAccessor]);

  // compute pagination
  const pageSize = recordsPerPage || 20;
  const currentPage = page ? page - 1 : 0; // MRT zero-based
  const rowCount = totalRecords || data.length;

  const table = useMantineReactTable({
    columns: orderedColumns as any,
    data,
    getRowId: (row: any) => String(row[idAccessor]),
    state: {
      isLoading: !!loading,
      pagination: { pageIndex: currentPage, pageSize },
      rowSelection,
      sorting: (sorting as any) || [],
      columnFilters,
    },
    manualPagination: true,
    rowCount,
    onPaginationChange: (updater: any) => {
      const current = { pageIndex: currentPage, pageSize };
      const next =
        typeof updater === 'function' ? updater(current) : updater || current;
      if (typeof next?.pageIndex === 'number') {
        onPageChange?.(next.pageIndex + 1);
      }
      if (typeof next?.pageSize === 'number' && next.pageSize !== pageSize) {
        onRecordsPerPageChange?.(next.pageSize);
      }
    },
    // selection
    enableRowSelection: !!onSelectedRecordsChange,
    onRowSelectionChange: (updater: any) => {
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectedRecordsChange) {
        const selected = Object.keys(next)
          .filter((k) => next[k])
          .map((k) => data.find((r: any) => String(r[idAccessor]) === k))
          .filter(Boolean) as T[];
        onSelectedRecordsChange(selected);
      }
    },
    // sorting/filtering (server when provided)
    manualSorting: !!onSortingChange,
    onSortingChange: (updater: any) => {
      const next =
        typeof updater === 'function'
          ? updater((sorting as any) || [])
          : updater;
      onSortingChange?.(next as SortingState);
    },
    manualFiltering: !!onColumnFiltersChange,
    onColumnFiltersChange: (updater: any) => {
      const next =
        typeof updater === 'function' ? updater(columnFilters || []) : updater;
      onColumnFiltersChange?.(next);
    },
    // pinning last column
    enableColumnPinning: !!pinLastColumn,
    initialState: pinLastColumn
      ? {
          columnPinning: {
            right:
              orderedColumns.length > 0
                ? [
                    String(
                      (orderedColumns as any)[orderedColumns.length - 1].id,
                    ),
                  ]
                : [],
          },
        }
      : undefined,
    // height
    mantineTableContainerProps: height ? { style: { height } } : undefined,
  });

  return (
    <MantineReactTable
      table={table}
      renderBottomToolbarCustom={() => {
        const start =
          rowCount === 0 ? 0 : currentPage * pageSize + (rowCount > 0 ? 1 : 0);
        const end = Math.min((currentPage + 1) * pageSize, rowCount);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {storeColumnsKey ? (
              <ColumnOrdering
                columns={mappedColumns}
                storeColumnsKey={storeColumnsKey}
                onOrdered={setOrderedColumns as any}
              />
            ) : null}
            <div>
              {start || 0} - {end || 0} of {rowCount}
            </div>
          </div>
        );
      }}
      {...(props as any)}
    />
  );
}

export type { DataTableColumn } from './DataTable/types';
