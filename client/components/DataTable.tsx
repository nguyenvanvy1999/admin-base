import { booleanStatusMap } from '@client/utils/booleanStatusMap';
import { formatDate, formatDecimal, formatInt } from '@client/utils/format';
import {
  Group,
  Pagination,
  Select,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import {
  MantineReactTable,
  useMantineReactTable,
} from 'mantine-react-table-open';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DataTableColumn } from './DataTable/types';
import { MetaVisualizer } from './MetaVisualizer';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

type SortingState = { id: string; desc: boolean }[];
type ColumnFilter = { id: string; value: unknown };

type Props<T> = {
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
};

export function DataTable<T extends { id: string } = { id: string }>({
  idAccessor = 'id',
  columns,
  data,
  isLoading: isLoadingProp,
  loading,
  enableRowNumbers = true,
  pinLastColumn,
  height,
  selectedRecords,
  onSelectedRecordsChange,
  storeColumnsKey,
  autoFormatDisabled,
  pageSize: pageSizeProp,
  recordsPerPage,
  pageSizeOptions: pageSizeOptionsProp,
  recordsPerPageOptions,
  onPageSizeChange,
  onRecordsPerPageChange,
  recordsPerPageLabel,
  page,
  onPageChange,
  rowCount: rowCountProp,
  totalRecords,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  ...props
}: Props<T>) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const isLoading = isLoadingProp ?? loading ?? false;
  const pageSize = pageSizeProp ?? recordsPerPage ?? 20;
  const pageSizeOptions = pageSizeOptionsProp ?? recordsPerPageOptions ?? [];
  const rowCount = rowCountProp ?? totalRecords;

  const safeData: T[] = useMemo(() => {
    if (data && Array.isArray(data)) {
      return data;
    }
    return [] as T[];
  }, [data]);

  const autoFormat = (value: any): any => {
    if (value instanceof Date) {
      return formatDate(value);
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
        return formatDate(value);
      }
      if (value !== '' && Number.isFinite(+value) && !autoFormatDisabled) {
        return value.includes('.') ? formatDecimal(+value) : formatInt(+value);
      }
    }

    if (valueType === 'number' && !autoFormatDisabled) {
      return Number.isInteger(value) ? formatInt(value) : formatDecimal(value);
    }

    return value;
  };

  const toPx = (rem?: string) => {
    if (!rem) return undefined;
    const num = parseFloat(rem.replace('rem', ''));
    return Number.isFinite(num) ? Math.round(num * 16) : undefined;
  };

  const mappedColumns = useMemo<ColumnDef<T>[]>(() => {
    return columns.map((col, idx) => {
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
        Cell: ({
          row,
          cell,
        }: {
          row: { original: T; index: number };
          cell: { getValue: () => unknown };
        }) => {
          const record = row.original;
          const value = cell.getValue();
          let content: React.ReactNode;
          if (col.render) {
            content = col.render(value, record, row.index);
          } else if (!autoFormatDisabled) {
            content =
              typeof col.accessor === 'function'
                ? autoFormat((col.accessor as (r: T) => unknown)(record))
                : autoFormat(value);
          } else {
            content = value as React.ReactNode;
          }
          const style: React.CSSProperties = {
            textAlign: col.textAlign || 'center',
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
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  col.textAlign === 'right'
                    ? 'flex-end'
                    : col.textAlign === 'left'
                      ? 'flex-start'
                      : 'center',
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
        filterVariant: col.filterVariant,
        filterSelectOptions: col.filterOptions,
        enableSorting: col.enableSorting !== false,
        mantineTableHeadCellProps: {
          align: 'center',
          style: {
            padding: theme.spacing.xs,
            textAlign: 'center',
          },
        },
        mantineTableBodyCellProps: {
          style: {
            padding: theme.spacing.xs,
            textAlign: col.textAlign || 'center',
          },
        },
      };
    });
  }, [columns, t, autoFormatDisabled, theme]);

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (storeColumnsKey) {
      const storageKey = `${storeColumnsKey}_columns`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const visibility = JSON.parse(stored);
          setColumnVisibility(visibility);
        } catch {
          // ignore parse errors
        }
      }
    }
  }, [storeColumnsKey]);

  useEffect(() => {
    if (storeColumnsKey && Object.keys(columnVisibility).length > 0) {
      const storageKey = `${storeColumnsKey}_columns`;
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility, storeColumnsKey]);

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (selectedRecords && onSelectedRecordsChange) {
      const map: Record<string, boolean> = {};
      selectedRecords.forEach((r) => {
        const id = (r as any)[idAccessor];
        if (id) map[String(id)] = true;
      });
      setRowSelection(map);
    }
  }, [selectedRecords, onSelectedRecordsChange, idAccessor]);

  const currentPage = page ? page - 1 : 0;
  const tableData = useMemo(() => {
    if (!safeData || !Array.isArray(safeData)) {
      return [] as T[];
    }
    return safeData;
  }, [safeData]);

  const computedRowCount = useMemo(() => {
    if (typeof rowCount === 'number') {
      return rowCount;
    }
    return tableData.length;
  }, [rowCount, tableData.length]);

  const handlePageSizeChange = (newPageSize: number) => {
    onPageSizeChange?.(newPageSize);
    onRecordsPerPageChange?.(newPageSize);
  };

  const table = useMantineReactTable({
    columns: mappedColumns as any,
    data: tableData,
    ...(enableRowNumbers
      ? { enableRowNumbers: true, rowNumberDisplayMode: 'static' }
      : {}),
    getRowId: (row) => String(row[idAccessor]),
    enableColumnResizing: false,
    ...(storeColumnsKey
      ? {
          enableColumnVisibility: true,
          onColumnVisibilityChange: setColumnVisibility,
          columnVisibility,
        }
      : {}),
    mantineTableProps: {
      style: {
        width: '100%',
      },
    },
    state: {
      isLoading,
      pagination: { pageIndex: currentPage, pageSize },
      rowSelection,
      sorting: sorting || [],
      columnFilters: columnFilters || [],
    },
    manualPagination: true,
    rowCount: computedRowCount,
    onPaginationChange: (updater) => {
      const current = { pageIndex: currentPage, pageSize };
      const next =
        typeof updater === 'function' ? updater(current) : updater || current;
      if (typeof next?.pageIndex === 'number') {
        onPageChange?.(next.pageIndex + 1);
      }
      if (typeof next?.pageSize === 'number' && next.pageSize !== pageSize) {
        handlePageSizeChange(next.pageSize);
      }
    },
    enableRowSelection: !!onSelectedRecordsChange,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectedRecordsChange) {
        const selected = Object.keys(next)
          .filter((k) => next[k])
          .map((k) => tableData.find((r) => String(r[idAccessor]) === k))
          .filter(Boolean) as T[];
        onSelectedRecordsChange(selected);
      }
    },
    manualSorting: !!onSortingChange,
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(sorting || []) : updater;
      onSortingChange?.(next as SortingState);
    },
    manualFiltering: !!onColumnFiltersChange,
    onColumnFiltersChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(columnFilters || []) : updater;
      onColumnFiltersChange?.(next);
    },
    enableColumnPinning: !!pinLastColumn,
    initialState: pinLastColumn
      ? {
          columnPinning: {
            right:
              mappedColumns.length > 0
                ? [String(mappedColumns[mappedColumns.length - 1].id)]
                : [],
          },
        }
      : undefined,
    mantineTableContainerProps: height ? { style: { height } } : undefined,
    mantineTopToolbarProps: {
      style: {
        padding: theme.spacing.md,
        backgroundColor: 'transparent',
        borderBottom: `1px solid ${
          colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
        }`,
        gap: theme.spacing.sm,
      },
    },
    mantineSearchTextInputProps: {
      size: 'xs',
      style: {
        fontSize: '12px',
        height: '28px',
        minHeight: '28px',
      },
    },
    mantineFilterTextInputProps: {
      size: 'xs',
      style: {
        fontSize: '12px',
        height: '28px',
        minHeight: '28px',
      },
    },
    mantineFilterSelectProps: {
      size: 'xs',
      style: {
        fontSize: '12px',
        height: '28px',
        minHeight: '28px',
      },
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    pageCount: computedRowCount ? Math.ceil(computedRowCount / pageSize) : 0,
    mantinePaginationProps: {
      radius: 'xl',
      size: 'lg',
    },
    mantineBottomToolbarProps: {
      style: {
        padding: theme.spacing.xs,
        backgroundColor: 'transparent',
        borderTop: `1px solid ${
          colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
        }`,
        gap: theme.spacing.xs,
        justifyContent: 'flex-end',
        display: 'flex',
        flexWrap: 'nowrap',
      },
    },
    mantineTableHeadCellProps: {
      style: {
        padding: theme.spacing.xs,
      },
    },
    mantineTableBodyCellProps: {
      style: {
        padding: theme.spacing.xs,
      },
    },
    renderEmptyRowsFallback: () => (
      <Text ta="center" c="dimmed">
        {t('common.noData', { defaultValue: 'Không có dữ liệu' })}
      </Text>
    ),
    renderBottomToolbar: ({ table: tableInstance }) => {
      const pagination = tableInstance.getState().pagination;
      const start =
        computedRowCount === 0
          ? 0
          : pagination.pageIndex * pagination.pageSize + 1;
      const end = Math.min(
        (pagination.pageIndex + 1) * pagination.pageSize,
        computedRowCount,
      );
      const totalPages = computedRowCount
        ? Math.ceil(computedRowCount / pagination.pageSize)
        : 0;

      return (
        <Group justify="flex-end" gap="xs" wrap="nowrap" w="100%">
          {pageSizeOptions.length > 0 && (
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {recordsPerPageLabel ||
                  t('common.pageSizeLabel', { defaultValue: 'Hiển thị' })}
              </Text>
              <Select
                value={pagination.pageSize.toString()}
                onChange={(value) => {
                  if (value) {
                    handlePageSizeChange(parseInt(value, 10));
                  }
                }}
                data={pageSizeOptions.map((size) => ({
                  value: size.toString(),
                  label: size.toString(),
                }))}
                disabled={isLoading}
                size="xs"
                w={60}
                styles={{
                  input: {
                    minHeight: '24px',
                    height: '24px',
                    fontSize: '12px',
                  },
                }}
              />
            </Group>
          )}
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            <Text component="span" fw={500}>
              {start || 0}
            </Text>
            {' - '}
            <Text component="span" fw={500}>
              {end || 0}
            </Text>{' '}
            {t('common.of', { defaultValue: 'of' })}{' '}
            <Text component="span" fw={500}>
              {computedRowCount}
            </Text>
          </Text>
          {totalPages > 0 && (
            <Pagination
              total={totalPages}
              value={pagination.pageIndex + 1}
              onChange={(newPage: number) => {
                onPageChange?.(newPage);
              }}
              disabled={isLoading}
              size="lg"
              radius="xl"
            />
          )}
        </Group>
      );
    },
  });

  return <MantineReactTable table={table} {...(props as any)} />;
}

export type { DataTableColumn };
