export type SortOrder = 'asc' | 'desc';

export function calculatePagination(
  page: number,
  limit: number,
): {
  skip: number;
  take: number;
} {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function buildOrderByFromMap<
  TSortKey extends string,
  TModel extends Record<string, unknown>,
>(
  sortBy: TSortKey | undefined,
  sortOrder: SortOrder = 'desc',
  fieldMap: Record<TSortKey, keyof TModel>,
): Partial<Record<keyof TModel, SortOrder>> | undefined {
  if (!sortBy || !(sortBy in fieldMap)) {
    return undefined;
  }

  const field = fieldMap[sortBy];
  return {
    [field]: sortOrder,
  } as Partial<Record<keyof TModel, SortOrder>>;
}
