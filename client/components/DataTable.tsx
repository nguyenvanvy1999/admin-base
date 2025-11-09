import { ActionIcon, Button, Select, TextInput } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { X } from 'lucide-react';
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

  const finalColumns = useMemo(() => {
    const cols = [...columns];
    if (actions) {
      cols.push(createActionColumn(actions));
    }
    return cols;
  }, [columns, actions]);

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
                {table.getHeaderGroups()[0]?.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
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
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
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
