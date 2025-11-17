import type { IDb } from '@server/configs/db';
import { ErrorCode, throwAppError } from '@server/share/constants/error';

/**
 * Date formatting utilities
 */
export const dateFormatter = {
  /**
   * Convert Date to ISO string, handling null values
   */
  toIsoString: (date: Date | null | undefined): string | null => {
    return date ? date.toISOString() : null;
  },

  /**
   * Convert Date to ISO string, throwing error if null
   */
  toIsoStringRequired: (date: Date): string => {
    return date.toISOString();
  },
};

/**
 * Decimal formatting utilities
 */
export const decimalFormatter = {
  /**
   * Convert Decimal to string
   */
  toString: (decimal: any): string => {
    return decimal.toString();
  },

  /**
   * Convert Decimal to string, handling null values
   */
  toNullableString: (decimal: any | null | undefined): string | null => {
    return decimal ? decimal.toString() : null;
  },
};

/**
 * Pagination helper utilities
 */
export const paginationHelper = {
  /**
   * Calculate skip value for pagination
   */
  calculateSkip: (page: number, limit: number): number => {
    return (page - 1) * limit;
  },

  /**
   * Create pagination response object
   */
  createResponse: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }),
};

/**
 * Create a unique name validator for a specific model
 */
export const createNameValidator = (db: IDb, modelName: string) => {
  return {
    /**
     * Validate that a name is unique for a user
     * @throws AppError if name already exists
     */
    async validateUniqueName(
      userId: string,
      name: string,
      excludeId?: string,
    ): Promise<void> {
      const where: any = { userId, name };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await db[modelName].count({ where });

      if (count > 0) {
        throwAppError(
          ErrorCode.DUPLICATE_NAME,
          `${modelName} name already exists`,
        );
      }
    },
  };
};

/**
 * Create a case-insensitive unique name validator
 */
export const createCaseInsensitiveNameValidator = (
  db: IDb,
  modelName: string,
) => {
  return {
    /**
     * Validate that a name is unique for a user (case-insensitive)
     * @throws AppError if name already exists
     */
    async validateUniqueName(
      userId: string,
      name: string,
      excludeId?: string,
    ): Promise<void> {
      const lowerName = name.toLowerCase().trim();
      const where: any = { userId, name: lowerName };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await db[modelName].count({ where });

      if (count > 0) {
        throwAppError(
          ErrorCode.DUPLICATE_NAME,
          `${modelName} name already exists`,
        );
      }
    },
  };
};

/**
 * Common entity formatter
 * Formats dates to ISO strings
 */
export const createEntityFormatter = <T extends Record<string, any>>() => {
  return {
    format: (entity: T): T => {
      const formatted = { ...entity };

      // Convert Date fields to ISO strings
      for (const key in formatted) {
        if (formatted[key] instanceof Date) {
          (formatted as any)[key] = formatted[key].toISOString();
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
): Record<string, any> | undefined => {
  if (!search || !search.trim()) {
    return undefined;
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
  return whereClauses.reduce((acc, where) => {
    if (where) {
      return { ...acc, ...where };
    }
    return acc;
  }, {});
};
