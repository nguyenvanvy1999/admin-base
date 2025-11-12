import { booleanStatusMap } from '@client/utils/booleanStatusMap';
import { formatDate, formatDecimal, formatInt } from '@client/utils/format';
import {
  Box,
  Group,
  Pagination,
  Select,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
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
  data?: T[];
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
  loading,
  enableRowNumbers = true,
  pinLastColumn,
  height,
  selectedRecords,
  onSelectedRecordsChange,
  storeColumnsKey,
  autoFormatDisabled,
  recordsPerPage,
  recordsPerPageOptions,
  onRecordsPerPageChange,
  recordsPerPageLabel,
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
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
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
            content = col.render(value, record, row.index);
          } else if (!autoFormatDisabled) {
            content =
              typeof col.accessor === 'function'
                ? autoFormat((col.accessor as (r: T) => unknown)(record))
                : autoFormat(value);
          } else {
            content = value;
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
            padding: theme.spacing.md,
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

    return baseCols as any[];
  }, [columns, t, enableRowNumbers, autoFormatDisabled, recordsPerPage, page]);

  const [orderedColumns, setOrderedColumns] = useState(mappedColumns);

  useEffect(() => {
    setOrderedColumns(mappedColumns);
  }, [mappedColumns]);

  // selection state mapping
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

  // compute pagination
  const pageSize = recordsPerPage || 20;
  const currentPage = page ? page - 1 : 0;
  const tableData = useMemo(() => {
    if (!safeData || !Array.isArray(safeData)) {
      return [] as T[];
    }
    return safeData;
  }, [safeData]);

  const rowCount = useMemo(() => {
    if (typeof totalRecords === 'number') {
      return totalRecords;
    }
    return tableData.length;
  }, [totalRecords, tableData.length]);

  const totalPages = useMemo(() => {
    return Math.ceil(rowCount / pageSize);
  }, [rowCount, pageSize]);

  const table = useMantineReactTable({
    columns: orderedColumns as any,
    data: tableData,
    ...(enableRowNumbers
      ? { enableRowNumbers: true, rowNumberDisplayMode: 'static' }
      : {}),
    getRowId: (row: any) => String(row[idAccessor]),
    enableColumnResizing: false,
    mantineTableProps: {
      style: {
        width: '100%',
      },
    },
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
          .map((k) => tableData.find((r: any) => String(r[idAccessor]) === k))
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
    // top toolbar styling
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
    // use custom bottom toolbar instead of default pagination
    enablePagination: true,
    paginationDisplayMode: 'pages',
    mantinePaginationProps: {
      radius: 'xl',
      size: 'lg',
    },
    // bottom toolbar styling
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
    // table cell styling - ensure header and body cells have same padding
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
    // empty rows fallback
    renderEmptyRowsFallback: () => (
      <Text ta="center" c="dimmed">
        {t('common.noData', { defaultValue: 'Không có dữ liệu' })}
      </Text>
    ),
  });

  const start =
    rowCount === 0 ? 0 : currentPage * pageSize + (rowCount > 0 ? 1 : 0);
  const end = Math.min((currentPage + 1) * pageSize, rowCount);

  // Sync column widths between header and body cells to fix alignment
  useEffect(() => {
    const syncColumnWidths = () => {
      const headerCells = document.querySelectorAll(
        '.mrt-table-head th[data-index]',
      );
      const bodyCells = document.querySelectorAll(
        '.mrt-table-body td[data-index]',
      );

      if (headerCells.length === 0 || bodyCells.length === 0) return;

      headerCells.forEach((headerCell, colIndex) => {
        const headerStyle = window.getComputedStyle(headerCell);
        const headerWidth = headerStyle.width;

        if (headerWidth && headerWidth !== 'auto' && headerWidth !== '0px') {
          // Apply to all body cells in the same column
          bodyCells.forEach((bodyCell) => {
            const cellIndex = (bodyCell as HTMLElement).getAttribute(
              'data-index',
            );
            if (cellIndex === String(colIndex)) {
              const bodyStyle = window.getComputedStyle(bodyCell);
              const bodyWidth = bodyStyle.width;

              // Only sync if widths are significantly different
              if (
                Math.abs(parseFloat(headerWidth) - parseFloat(bodyWidth)) > 1
              ) {
                (bodyCell as HTMLElement).style.width = headerWidth;
                (bodyCell as HTMLElement).style.minWidth = headerWidth;
              }
            }
          });
        }
      });
    };

    const timer = setTimeout(syncColumnWidths, 100);
    return () => clearTimeout(timer);
  }, [tableData, orderedColumns, loading]);

  return (
    <MantineReactTable
      table={table}
      renderBottomToolbarCustom={() => (
        <Group justify="flex-end" gap="xs" wrap="nowrap" w="100%">
          {storeColumnsKey && (
            <Box style={{ flexShrink: 0 }}>
              <ColumnOrdering
                columns={mappedColumns}
                storeColumnsKey={storeColumnsKey}
                onOrdered={setOrderedColumns as any}
              />
            </Box>
          )}
          {recordsPerPageOptions && recordsPerPageOptions.length > 0 && (
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {recordsPerPageLabel ||
                  t('common.pageSizeLabel', { defaultValue: 'Hiển thị' })}
              </Text>
              <Select
                value={pageSize.toString()}
                onChange={(value) => {
                  if (value) {
                    onRecordsPerPageChange?.(parseInt(value, 10));
                  }
                }}
                data={recordsPerPageOptions.map((size) => ({
                  value: size.toString(),
                  label: size.toString(),
                }))}
                disabled={!!loading}
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
              {rowCount}
            </Text>
          </Text>
          {totalPages > 0 && (
            <Box style={{ flexShrink: 0 }}>
              <Pagination
                total={totalPages}
                value={page || 1}
                onChange={(newPage: number) => {
                  onPageChange?.(newPage);
                }}
                disabled={!!loading}
                size="lg"
                radius="xl"
              />
            </Box>
          )}
        </Group>
      )}
      {...(props as any)}
    />
  );
}

export type { DataTableColumn };
