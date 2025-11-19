import type { ErrorCodeType } from '@server/share/constants/error';
import { validateResourceOwnership } from '@server/share/utils/ownership.util';
import {
  buildOrderByFromMap,
  buildPaginationMeta,
  calculatePagination,
} from '@server/share/utils/pagination.util';
import type { BaseServiceDependencies } from './service-dependencies';

/**
 * Base service class providing common functionality for all services
 */
export abstract class BaseService {
  protected readonly db: BaseServiceDependencies['db'];
  protected readonly idUtil: BaseServiceDependencies['idUtil'];

  constructor(protected readonly deps: BaseServiceDependencies) {
    this.db = deps.db;
    this.idUtil = deps.idUtil;
  }

  /**
   * Validates that a resource belongs to a specific user
   */
  protected validateOwnership(
    userId: string,
    resourceId: string,
    errorCode: ErrorCodeType,
    errorMessage: string,
  ): void {
    validateResourceOwnership(
      userId,
      resourceId,
      this.idUtil,
      errorCode,
      errorMessage,
    );
  }

  /**
   * Calculates pagination skip value
   */
  protected calculateSkip(page: number, limit: number): number {
    return calculatePagination(page, limit).skip;
  }

  /**
   * Calculates total pages for pagination
   */
  protected calculateTotalPages(total: number, limit: number): number {
    return buildPaginationMeta(1, limit, total).totalPages;
  }

  /**
   * Builds pagination response metadata
   */
  protected buildPaginationResponse<T>(
    page: number,
    limit: number,
    total: number,
    items: T[],
  ): {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } {
    return {
      items,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  /**
   * Builds orderBy object for Prisma queries
   */
  protected buildOrderBy<T extends Record<string, any>>(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc' = 'desc',
    fieldMap: Record<string, keyof T>,
  ): Partial<Record<keyof T, 'asc' | 'desc'>> | undefined {
    return buildOrderByFromMap(sortBy, sortOrder, fieldMap);
  }
}
