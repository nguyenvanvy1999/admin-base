import { useMemo, useState } from 'react';

type SortField = string;

type UsePaginationSortingOptions<TSortField extends SortField> = {
  defaultPage?: number;
  defaultLimit?: number;
  defaultSortBy?: TSortField;
  defaultSortOrder?: 'asc' | 'desc';
};

type SortingState = {
  id: string;
  desc: boolean;
}[];

export function usePaginationSorting<TSortField extends SortField>({
  defaultPage = 1,
  defaultLimit = 20,
  defaultSortBy,
  defaultSortOrder = 'desc',
}: UsePaginationSortingOptions<TSortField> = {}) {
  const [page, setPage] = useState(defaultPage);
  const [limit, setLimit] = useState(defaultLimit);
  const [sortBy, setSortBy] = useState<TSortField | undefined>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [page, limit, sortBy, sortOrder],
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleSortingChange = (
    updater: SortingState | ((prev: SortingState) => SortingState),
    fallbackSortBy?: TSortField,
  ) => {
    const currentSorting: SortingState = sortBy
      ? [{ id: sortBy, desc: sortOrder === 'desc' }]
      : [];

    const newSorting =
      typeof updater === 'function' ? updater(currentSorting) : updater;

    if (newSorting.length > 0) {
      setSortBy(newSorting[0].id as TSortField);
      setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
    } else if (fallbackSortBy) {
      setSortBy(fallbackSortBy);
      setSortOrder('desc');
    } else {
      setSortBy(undefined);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const sorting = useMemo(
    () =>
      sortBy
        ? [
            {
              id: sortBy,
              desc: sortOrder === 'desc',
            },
          ]
        : undefined,
    [sortBy, sortOrder],
  );

  const reset = () => {
    setPage(defaultPage);
    setLimit(defaultLimit);
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
  };

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    queryParams,
    sorting,
    setPage: handlePageChange,
    setLimit: handleLimitChange,
    setSorting: handleSortingChange,
    reset,
  };
}
