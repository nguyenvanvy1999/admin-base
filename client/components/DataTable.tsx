import { ActionIcon, Button, Select, TextInput } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ActionColumnOptions,
  createActionColumn,
} from './DataTable/utils';
import Pagination from './Pagination';

export type { ActionColumnOptions } from './DataTable/utils';

export type DataTableProps<T extends Record<string, any>> = {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
  search?: {
    placeholder?: string;
    onSearch: (searchValue: string) => void;
  };
  pageSize?: {
    initialSize?: number;
    options?: number[];
    onPageSizeChange: (size: number) => void;
  };
  filters?: {
    slots?: React.ReactNode[];
    onReset?: () => void;
    hasActive?: boolean;
  };
  actions?: ActionColumnOptions<T>;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  };
};

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  pagination,
  search,
  pageSize,
  filters,
  actions,
  onRowClick,
  emptyMessage,
  sorting,
}: DataTableProps<T>) {
  const { t } = useTranslation();

  const [searchInput, setSearchInput] = useState('');
  const [currentPageSize, setCurrentPageSize] = useState(
    pageSize?.initialSize || 20,
  );

  const handleSearch = useCallback(() => {
    if (search?.onSearch) {
      search.onSearch(searchInput);
      if (pagination) {
        pagination.onPageChange(1);
      }
    }
  }, [search, searchInput, pagination]);

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setCurrentPageSize(size);
      if (pageSize?.onPageSizeChange) {
        pageSize.onPageSizeChange(size);
      }
      if (pagination) {
        pagination.onPageChange(1);
      }
    },
    [pageSize, pagination],
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    if (search?.onSearch) {
      search.onSearch('');
    }
    if (pagination) {
      pagination.onPageChange(1);
    }
  }, [search, pagination]);

  const handleReset = useCallback(() => {
    setSearchInput('');
    if (filters?.onReset) {
      filters.onReset();
    }
    if (pagination) {
      pagination.onPageChange(1);
    }
  }, [filters, pagination]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchInput.trim() !== '' ||
      (filters?.hasActive !== undefined && filters.hasActive)
    );
  }, [searchInput, filters?.hasActive]);

  const handleSort = useCallback(
    (columnId: string) => {
      if (!sorting?.onSortChange) return;

      const currentSortBy = sorting.sortBy;
      const currentSortOrder = sorting.sortOrder || 'asc';

      if (currentSortBy === columnId) {
        const newOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        sorting.onSortChange(columnId, newOrder);
      } else {
        sorting.onSortChange(columnId, 'asc');
      }

      if (pagination) {
        pagination.onPageChange(1);
      }
    },
    [sorting, pagination],
  );

  const finalColumns = useMemo(() => {
    const indexColumn: ColumnDef<T> = {
      id: 'index',
      header: () => t('common.index', { defaultValue: 'STT' }),
      cell: (info) => {
        const rowIndex = info.row.index;
        const currentPage = pagination?.currentPage || 1;
        const itemsPerPage = pagination?.itemsPerPage || currentPageSize;
        const index = (currentPage - 1) * itemsPerPage + rowIndex + 1;
        return (
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            {index}
          </span>
        );
      },
      size: 80,
      enableSorting: false,
    };

    const cols = [indexColumn, ...columns];
    if (actions) {
      cols.push(createActionColumn(actions));
    }
    return cols;
  }, [columns, actions, pagination, currentPageSize, t]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const pageSizeOptions = pageSize?.options || [10, 20, 50, 100];

  const hasFilters = filters && (hasActiveFilters || filters.slots?.length);

  return (
    <div className="space-y-4">
      {(search || pageSize || hasFilters) && (
        <div className="flex flex-col md:flex-row gap-4">
          {search && (
            <div className="w-full md:w-64">
              <TextInput
                value={searchInput}
                onChange={(e) =>
                  setSearchInput((e.target as HTMLInputElement).value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder={search.placeholder || t('common.search')}
                rightSection={
                  searchInput.trim() !== '' ? (
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      onClick={handleClearSearch}
                      disabled={isLoading}
                    >
                      <X size={16} />
                    </ActionIcon>
                  ) : null
                }
              />
            </div>
          )}

          {filters?.slots?.map((slot, index) => (
            <div key={index} className="w-full md:w-48">
              {slot}
            </div>
          ))}

          {pageSize && (
            <div className="w-full md:w-32">
              <Select
                value={currentPageSize.toString()}
                onChange={(value) => {
                  if (value) {
                    handlePageSizeChange(parseInt(value, 10));
                  }
                }}
                placeholder={t('common.pageSize', {
                  defaultValue: 'Page Size',
                })}
                data={pageSizeOptions.map((size) => ({
                  value: size.toString(),
                  label: size.toString(),
                }))}
              />
            </div>
          )}

          <div className="w-full md:w-auto flex gap-2">
            {search && (
              <Button onClick={handleSearch} disabled={isLoading}>
                {t('common.search')}
              </Button>
            )}
            {filters && hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
              >
                {t('common.reset', { defaultValue: 'Reset' })}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto shadow-md rounded-lg">
        {isLoading ? (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {table.getHeaderGroups()[0]?.headers.map((header) => {
                  const columnDef = header.column.columnDef;
                  const isSortable =
                    sorting?.onSortChange && columnDef.enableSorting !== false;
                  const columnId = header.column.id;
                  const isSorted =
                    sorting?.sortBy === columnId && sorting?.sortOrder;
                  const sortOrder = isSorted ? sorting.sortOrder : null;

                  return (
                    <th
                      key={header.id}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                        isSortable
                          ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(columnDef.header, header.getContext())}
                        {isSortable && (
                          <span className="flex flex-col">
                            {sortOrder === 'asc' ? (
                              <ArrowUp
                                size={12}
                                className="text-blue-600 dark:text-blue-400"
                              />
                            ) : sortOrder === 'desc' ? (
                              <ArrowDown
                                size={12}
                                className="text-blue-600 dark:text-blue-400"
                              />
                            ) : (
                              <span className="flex flex-col opacity-30">
                                <ArrowUp size={10} />
                                <ArrowDown size={10} className="-mt-1" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {table.getHeaderGroups()[0]?.headers.map((header) => (
                    <td key={header.id} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : data.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              {emptyMessage || t('common.noData', { defaultValue: 'No data' })}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const columnDef = header.column.columnDef;
                    const isSortable =
                      sorting?.onSortChange &&
                      columnDef.enableSorting !== false;
                    const columnId = header.column.id;
                    const isSorted =
                      sorting?.sortBy === columnId && sorting?.sortOrder;
                    const sortOrder = isSorted ? sorting.sortOrder : null;

                    return (
                      <th
                        key={header.id}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                          isSortable
                            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none'
                            : ''
                        }`}
                        onClick={() => isSortable && handleSort(columnId)}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(columnDef.header, header.getContext())}
                          {isSortable && (
                            <span className="flex flex-col">
                              {sortOrder === 'asc' ? (
                                <ArrowUp
                                  size={12}
                                  className="text-blue-600 dark:text-blue-400"
                                />
                              ) : sortOrder === 'desc' ? (
                                <ArrowDown
                                  size={12}
                                  className="text-blue-600 dark:text-blue-400"
                                />
                              ) : (
                                <span className="flex flex-col opacity-30">
                                  <ArrowUp size={10} />
                                  <ArrowDown size={10} className="-mt-1" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${
                    onRowClick
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                      : ''
                  }`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 0 && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default DataTable;
