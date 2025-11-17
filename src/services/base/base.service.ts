import type { IDb } from '@server/configs/db';
import type { ActionRes } from '@server/dto/common.dto';
import {
  type DB_PREFIX,
  ERROR_MESSAGES,
  ErrorCode,
  throwAppError,
} from '@server/share';
import type { IBaseRepository } from '../../repositories/base/base.repository';
import type {
  ICacheService,
  IDb,
  IIdUtil,
  IOwnershipValidatorService,
} from './interfaces';

/**
 * Base service configuration
 */
export interface BaseServiceConfig {
  entityName: string;
  dbPrefix: DB_PREFIX;
}

/**
 * Base service dependencies
 */
export interface BaseServiceDeps<TRepository extends IBaseRepository<any>> {
  db: IDb;
  repository: TRepository;
  ownershipValidator: IOwnershipValidatorService;
  idUtil: IIdUtil;
  cache?: ICacheService;
}

/**
 * Base service interface
 */
export interface IBaseService<TDto, TResponse, TListResponse> {
  upsert(userId: string, data: TDto): Promise<TResponse>;
  list(userId: string, query: any): Promise<TListResponse>;
  deleteMany(userId: string, ids: string[]): Promise<ActionRes>;
}

/**
 * Abstract base service class
 * Provides common functionality for all services
 * Reduces code duplication and enforces consistent patterns
 *
 * @template TEntity - The entity type from database
 * @template TDto - The DTO type for create/update operations
 * @template TResponse - The response type for single entity
 * @template TListResponse - The response type for list operations
 * @template TRepository - The repository type
 */
export abstract class BaseService<
  TEntity,
  TDto,
  TResponse,
  TListResponse,
  TRepository extends IBaseRepository<any>,
> implements IBaseService<TDto, TResponse, TListResponse>
{
  constructor(
    protected readonly deps: BaseServiceDeps<TRepository>,
    protected readonly config: BaseServiceConfig,
  ) {}

  /**
   * Validate entity ownership
   * @throws AppError if entity not found or doesn't belong to user
   */
  protected async validateOwnership(userId: string, id: string): Promise<void> {
    const entity = await this.deps.repository.findByIdAndUserId(id, userId);
    if (!entity) {
      throwAppError(ErrorCode.NOT_FOUND, `${this.config.entityName} not found`);
    }
  }

  /**
   * Validate unique name
   * Override this method in child classes if needed
   */
  protected async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Format entity for response
   * Override this method in child classes
   */
  protected abstract formatEntity(entity: TEntity): TResponse;

  /**
   * Create or update entity (upsert pattern)
   */
  abstract upsert(userId: string, data: TDto): Promise<TResponse>;

  /**
   * List entities with pagination and filtering
   */
  abstract list(userId: string, query: any): Promise<TListResponse>;

  /**
   * Delete multiple entities
   * Common implementation that can be used by all services
   */
  async deleteMany(userId: string, ids: string[]): Promise<ActionRes> {
    // Validate all entities exist and belong to user
    const entities = await this.deps.repository.findManyByIdsAndUserId(
      ids,
      userId,
    );

    if (entities.length !== ids.length) {
      throwAppError(
        ErrorCode.NOT_FOUND,
        `Some ${this.config.entityName}s were not found or do not belong to you`,
      );
    }

    // Perform additional validation if needed (override in child class)
    await this.validateBeforeDelete(entities);

    // Delete entities
    await this.deps.repository.deleteMany(ids);

    return {
      success: true,
      message: `${ids.length} ${this.config.entityName}(s) deleted successfully`,
    };
  }

  /**
   * Additional validation before delete
   * Override this method in child classes if needed
   */
  protected async validateBeforeDelete(entities: any[]): Promise<void> {
    // Default: no additional validation
  }

  /**
   * Build pagination response
   */
  protected buildPaginationResponse(
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

  /**
   * Calculate skip for pagination
   */
  protected calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }
}
