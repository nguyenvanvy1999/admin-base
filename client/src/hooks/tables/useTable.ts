import type { SortOrder } from '@client/types/common';
import type { PaginationProps } from 'antd';
import { useCallback, useMemo, useState } from 'react';

export interface UseTableOptions {
  defaultPageSize?: number;
  defaultCurrent?: number;
  defaultSortField?: string;
  defaultSortOrder?: SortOrder;
}

export interface TableState {
  current: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: SortOrder;
  filters?: Record<string, unknown>;
}

export interface UseTableReturn {
  state: TableState;
  setCurrent: (current: number) => void;
  setPageSize: (pageSize: number) => void;
  setSort: (field: string, order: SortOrder) => void;
  setFilters: (filters: Record<string, unknown>) => void;
  reset: () => void;
  pagination: PaginationProps;
}

/**
 * Hook for table state management (pagination, filters, sorting)
 */
export function useTable(options: UseTableOptions = {}): UseTableReturn {
  const {
    defaultPageSize = 10,
    defaultCurrent = 1,
    defaultSortField,
    defaultSortOrder,
  } = options;

  const [current, setCurrent] = useState(defaultCurrent);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortField, setSortField] = useState<string | undefined>(
    defaultSortField,
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    defaultSortOrder ?? null,
  );
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const setSort = useCallback((field: string, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  const reset = useCallback(() => {
    setCurrent(defaultCurrent);
    setPageSize(defaultPageSize);
    setSortField(defaultSortField);
    setSortOrder(defaultSortOrder ?? null);
    setFilters({});
  }, [defaultCurrent, defaultPageSize, defaultSortField, defaultSortOrder]);

  const pagination = useMemo<PaginationProps>(
    () => ({
      current,
      pageSize,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total) => `Tổng ${total} mục`,
      onChange: (page, size) => {
        setCurrent(page);
        if (size !== pageSize) {
          setPageSize(size);
        }
      },
    }),
    [current, pageSize],
  );

  return {
    state: {
      current,
      pageSize,
      sortField,
      sortOrder,
      filters,
    },
    setCurrent,
    setPageSize,
    setSort,
    setFilters,
    reset,
    pagination,
  };
}
