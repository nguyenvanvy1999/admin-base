/**
 * Calculates pagination skip and take values
 */
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

/**
 * Builds pagination metadata response
 */
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

/**
 * Builds an orderBy object for Prisma queries
 * @param sortBy - The field to sort by
 * @param sortOrder - The sort order ('asc' or 'desc')
 * @param fieldMap - Map of allowed sort fields to their corresponding Prisma field names
 * @returns OrderBy object or undefined if sortBy is not in fieldMap
 */
export function buildOrderByFromMap<T extends Record<string, any>>(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' = 'desc',
  fieldMap: Record<string, keyof T>,
): Partial<Record<keyof T, 'asc' | 'desc'>> | undefined {
  if (!sortBy || !(sortBy in fieldMap)) {
    return undefined;
  }

  const field = fieldMap[sortBy];
  return {
    [field]: sortOrder,
  } as Partial<Record<keyof T, 'asc' | 'desc'>>;
}
