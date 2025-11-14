import type { Prisma } from '@server/generated/prisma/client';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult {
  skip: number;
  take: number;
}

export function buildPaginationQuery(
  params: PaginationParams,
  defaultPage = 1,
  defaultLimit = 20,
): PaginationResult {
  const page = params.page ?? defaultPage;
  const limit = params.limit ?? defaultLimit;
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationResponse(
  page: number,
  limit: number,
  total: number,
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function buildOrderBy<T extends Record<string, 'asc' | 'desc'>>(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' = 'desc',
  fieldMap: Record<string, keyof T>,
  defaultField: keyof T,
): T {
  const field = sortBy && fieldMap[sortBy] ? fieldMap[sortBy] : defaultField;
  return { [field]: sortOrder } as T;
}

export function buildSearchFilter(
  search: string | undefined,
  fields: string[],
): Prisma.StringFilter | undefined {
  if (!search || !search.trim()) {
    return undefined;
  }

  const trimmedSearch = search.trim();

  if (fields.length === 1) {
    return {
      contains: trimmedSearch,
      mode: 'insensitive',
    };
  }

  return {
    contains: trimmedSearch,
    mode: 'insensitive',
  };
}

export function buildArrayFilter<T>(
  values: T[] | undefined,
): { in: T[] } | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  return { in: values };
}

export function buildDateRangeFilter(
  dateFrom: string | Date | undefined,
  dateTo: string | Date | undefined,
): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (dateFrom) {
    filter.gte = typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
  }

  if (dateTo) {
    filter.lte = typeof dateTo === 'string' ? new Date(dateTo) : dateTo;
  }

  return filter;
}

export function buildOrSearchFilter(
  search: string | undefined,
  fields: Array<{ field: string; path?: string }>,
):
  | {
      OR: Array<
        Record<
          string,
          Prisma.StringFilter | Record<string, Prisma.StringFilter>
        >
      >;
    }
  | undefined {
  if (!search || !search.trim()) {
    return undefined;
  }

  const trimmedSearch = search.trim();

  return {
    OR: fields.map(({ field, path }) => {
      const filter: Prisma.StringFilter = {
        contains: trimmedSearch,
        mode: 'insensitive',
      };

      if (path) {
        return { [path]: { [field]: filter } };
      }

      return { [field]: filter };
    }),
  };
}
