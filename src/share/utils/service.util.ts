import { ErrorCode, throwAppError } from '@server/share/constants/error';

/**
 * Date formatting utilities
 */
export const dateFormatter = {
  toIsoString: (date: Date | null | undefined): string | null => {
    return date ? date.toISOString() : null;
  },
  toIsoStringRequired: (date: Date): string => {
    return date.toISOString();
  },
};

/**
 * Decimal formatting utilities
 */
export const decimalFormatter = {
  toString: (decimal: any): string => {
    return decimal.toString();
  },
  toNullableString: (decimal: any | null | undefined): string | null => {
    return decimal ? decimal.toString() : null;
  },
};

/**
 * Pagination helper utilities
 */
export const paginationHelper = {
  calculateSkip: (page: number, limit: number): number => {
    return (page - 1) * limit;
  },
  createResponse: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }),
};

/**
 * Common entity formatter
 * Formats dates to ISO strings
 */
export const createEntityFormatter = <T extends Record<string, any>>() => {
  return {
    format: (entity: T): T => {
      const formatted = { ...entity };
      for (const key in formatted) {
        const value = formatted[key];
        // Use a safer way to check for Date objects to avoid TS2358
        if (Object.prototype.toString.call(value) === '[object Date]') {
          (formatted as any)[key] = (value as Date).toISOString();
        }
      }
      return formatted;
    },
  };
};

/**
 * Build order by clause from sort parameters
 */
export const buildOrderBy = (
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Record<string, 'asc' | 'desc'> => {
  return { [sortBy]: sortOrder };
};

/**
 * Build search where clause for case-insensitive search
 */
export const buildSearchWhere = (
  field: string,
  search?: string,
): Record<string, any> => {
  if (!search || !search.trim()) {
    return {}; // Always return an object
  }
  return {
    [field]: {
      contains: search.trim(),
      mode: 'insensitive',
    },
  };
};

/**
 * Merge where clauses
 */
export const mergeWhere = (
  ...whereClauses: (Record<string, any> | undefined)[]
): Record<string, any> => {
  const finalWhere: Record<string, any> = {};
  for (const where of whereClauses) {
    if (where) {
      Object.assign(finalWhere, where);
    }
  }
  return finalWhere;
};
