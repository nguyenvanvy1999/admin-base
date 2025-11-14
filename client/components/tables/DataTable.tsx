import {
  ActionIcon,
  Group,
  Select,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import {
  MantineReactTable,
  useMantineReactTable,
} from 'mantine-react-table-open';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useColumnVisibility } from './hooks/useColumnVisibility';
import { useDataTableColumns } from './hooks/useDataTableColumns';
import { useRowSelection } from './hooks/useRowSelection';
import type { DataTableProps, SortingState } from './types';

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
  renderTopToolbarCustomActions,
  enableGrouping = false,
  grouping,
  onGroupingChange,
  initialGrouping,
}: DataTableProps<T>) {
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

  const themeSpacingXs = theme.spacing.xs;
  const themeSpacingMd = theme.spacing.md;
  const themeSpacingSm = theme.spacing.sm;
  const borderColor = useMemo(
    () =>
      colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3],
    [colorScheme, theme.colors.dark[4], theme.colors.gray[3]],
  );

  const topToolbarStyle = useMemo(
    () => ({
      padding: themeSpacingMd,
      backgroundColor: 'transparent' as const,
      borderBottom: `1px solid ${borderColor}`,
      gap: themeSpacingSm,
      display: 'flex' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    }),
    [themeSpacingMd, borderColor, themeSpacingSm],
  );

  const bottomToolbarStyle = useMemo(
    () => ({
      padding: themeSpacingXs,
      backgroundColor: 'transparent' as const,
      borderTop: `1px solid ${borderColor}`,
      gap: themeSpacingXs,
      justifyContent: 'flex-end' as const,
      display: 'flex' as const,
      flexWrap: 'nowrap' as const,
    }),
    [themeSpacingXs, borderColor],
  );

  const mappedColumns = useDataTableColumns<T>({
    columns,
    autoFormatDisabled,
    themeSpacingXs,
  });

  const { columnVisibility, setColumnVisibility } =
    useColumnVisibility(storeColumnsKey);

  const { rowSelection, handleRowSelectionChange } = useRowSelection<T>({
    selectedRecords,
    onSelectedRecordsChange,
    idAccessor,
    tableData: safeData,
  });

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

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      onPageSizeChange?.(newPageSize);
      onRecordsPerPageChange?.(newPageSize);
    },
    [onPageSizeChange, onRecordsPerPageChange],
  );

  const renderBottomToolbar = useCallback(
    ({
      table: tableInstance,
    }: {
      table: {
        getState: () => { pagination: { pageIndex: number; pageSize: number } };
      };
    }) => {
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
            <Group gap={4}>
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => {
                  if (pagination.pageIndex > 0) {
                    onPageChange?.(pagination.pageIndex);
                  }
                }}
                disabled={pagination.pageIndex === 0 || isLoading}
                aria-label="Previous page"
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed" px="xs">
                {pagination.pageIndex + 1} / {totalPages}
              </Text>
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => {
                  if (pagination.pageIndex < totalPages - 1) {
                    onPageChange?.(pagination.pageIndex + 2);
                  }
                }}
                disabled={pagination.pageIndex >= totalPages - 1 || isLoading}
                aria-label="Next page"
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          )}
        </Group>
      );
    },
    [
      computedRowCount,
      pageSizeOptions,
      recordsPerPageLabel,
      t,
      handlePageSizeChange,
      isLoading,
      onPageChange,
    ],
  );

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
      ...(onColumnFiltersChange ? { columnFilters: columnFilters || [] } : {}),
      ...(enableGrouping && grouping !== undefined ? { grouping } : {}),
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
    onRowSelectionChange: handleRowSelectionChange,
    manualSorting: !!onSortingChange,
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(sorting || []) : updater;
      onSortingChange?.(next as SortingState);
    },
    enableColumnFilters: true,
    enableGlobalFilter: false,
    manualFiltering: !!onColumnFiltersChange,
    ...(onColumnFiltersChange
      ? {
          onColumnFiltersChange: (updater) => {
            const next =
              typeof updater === 'function'
                ? updater(columnFilters || [])
                : updater;
            onColumnFiltersChange?.(next);
          },
        }
      : {}),
    enableGrouping: enableGrouping,
    ...(enableGrouping && onGroupingChange
      ? {
          onGroupingChange: (updater) => {
            const next =
              typeof updater === 'function' ? updater(grouping || []) : updater;
            onGroupingChange?.(next);
          },
        }
      : {}),
    enableColumnPinning: !!pinLastColumn,
    initialState: {
      ...(pinLastColumn
        ? {
            columnPinning: {
              right:
                mappedColumns.length > 0
                  ? [String(mappedColumns[mappedColumns.length - 1].id)]
                  : [],
            },
          }
        : {}),
      ...(enableGrouping && initialGrouping
        ? { grouping: initialGrouping, expanded: true }
        : {}),
    },
    mantineTableContainerProps: height ? { style: { height } } : undefined,
    mantineTopToolbarProps: {
      style: topToolbarStyle,
    },
    ...(renderTopToolbarCustomActions
      ? {
          renderTopToolbar: ({ table }) => (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {renderTopToolbarCustomActions({ table })}
            </div>
          ),
        }
      : {}),
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
    enablePagination: false,
    paginationDisplayMode: 'pages',
    pageCount: computedRowCount ? Math.ceil(computedRowCount / pageSize) : 0,
    mantineBottomToolbarProps: {
      style: bottomToolbarStyle,
    },
    mantineTableHeadCellProps: {
      style: {
        padding: themeSpacingXs,
      },
    },
    mantineTableBodyCellProps: {
      style: {
        padding: themeSpacingXs,
      },
    },
    renderEmptyRowsFallback: useCallback(
      () => (
        <Text ta="center" c="dimmed">
          {t('common.noData', { defaultValue: 'Không có dữ liệu' })}
        </Text>
      ),
      [t],
    ),
    renderBottomToolbar,
  });

  return <MantineReactTable table={table} />;
}

export type { DataTableColumn, DataTableProps } from './types';
