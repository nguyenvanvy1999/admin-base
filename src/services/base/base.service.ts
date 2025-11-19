import {
  buildOrderByFromMap,
  buildPaginationMeta,
  calculatePagination,
  type SortOrder,
} from '@server/share/utils/pagination.util';
import type { BaseServiceDependencies } from './service-dependencies';

export abstract class BaseService {
  protected readonly db: BaseServiceDependencies['db'];
  protected readonly idUtil: BaseServiceDependencies['idUtil'];

  constructor(protected readonly deps: BaseServiceDependencies) {
    this.db = deps.db;
    this.idUtil = deps.idUtil;
  }

  protected calculateSkip(page: number, limit: number): number {
    return calculatePagination(page, limit).skip;
  }

  protected calculateTotalPages(total: number, limit: number): number {
    return buildPaginationMeta(1, limit, total).totalPages;
  }

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

  protected buildOrderBy<
    TSortKey extends string,
    TModel extends Record<string, unknown>,
  >(
    sortBy: TSortKey | undefined,
    sortOrder: SortOrder = 'desc',
    fieldMap: Record<TSortKey, keyof TModel>,
  ): Partial<Record<keyof TModel, SortOrder>> | undefined {
    return buildOrderByFromMap<TSortKey, TModel>(sortBy, sortOrder, fieldMap);
  }
}
