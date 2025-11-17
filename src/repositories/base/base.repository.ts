import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';

/**
 * Interface for base repository operations
 * Provides type-safe CRUD operations for entities
 */
export interface IBaseRepository<TEntity, TSelect> {
  findById(id: string): Promise<TEntity | null>;
  findByIdAndUserId(id: string, userId: string): Promise<TEntity | null>;
  findMany(
    where: any,
    orderBy?: any,
    skip?: number,
    take?: number,
  ): Promise<TEntity[]>;
  findManyByUserId(
    userId: string,
    where: any,
    orderBy?: any,
    skip?: number,
    take?: number,
  ): Promise<TEntity[]>;
  findManyByIdsAndUserId(ids: string[], userId: string): Promise<TEntity[]>;
  count(where: any): Promise<number>;
  countByUserId(userId: string, where: any): Promise<number>;
  create(data: any): Promise<TEntity>;
  update(id: string, data: any): Promise<TEntity>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<number>;
}

/**
 * Base repository class providing common CRUD operations
 * Reduces code duplication across repositories
 *
 * @template TEntity - The entity type
 * @template TSelect - The select object type for Prisma queries
 */
export abstract class BaseRepository<TEntity, TSelect>
  implements IBaseRepository<TEntity, TSelect>
{
  protected constructor(
    protected readonly db: IDb,
    protected readonly modelName: string,
    protected readonly select: TSelect,
  ) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<TEntity | null> {
    return this.db[this.modelName].findUnique({
      where: { id },
      select: this.select,
    }) as Promise<TEntity | null>;
  }

  /**
   * Find entity by ID and user ID (for ownership validation)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<TEntity | null> {
    return this.db[this.modelName].findFirst({
      where: { id, userId },
      select: this.select,
    }) as Promise<TEntity | null>;
  }

  /**
   * Find multiple entities with optional filtering, sorting, and pagination
   */
  async findMany(
    where: any,
    orderBy?: any,
    skip?: number,
    take?: number,
  ): Promise<TEntity[]> {
    return this.db[this.modelName].findMany({
      where,
      orderBy,
      skip,
      take,
      select: this.select,
    }) as Promise<TEntity[]>;
  }

  /**
   * Find multiple entities by user ID with optional filtering, sorting, and pagination
   */
  async findManyByUserId(
    userId: string,
    where: any,
    orderBy?: any,
    skip?: number,
    take?: number,
  ): Promise<TEntity[]> {
    return this.db[this.modelName].findMany({
      where: {
        ...where,
        userId,
      },
      orderBy,
      skip,
      take,
      select: this.select,
    }) as Promise<TEntity[]>;
  }

  /**
   * Find multiple entities by IDs and user ID (for bulk operations)
   */
  async findManyByIdsAndUserId(
    ids: string[],
    userId: string,
  ): Promise<TEntity[]> {
    return this.db[this.modelName].findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: this.select,
    }) as Promise<TEntity[]>;
  }

  /**
   * Count entities matching the where clause
   */
  async count(where: any): Promise<number> {
    return this.db[this.modelName].count({ where });
  }

  /**
   * Count entities by user ID with optional filtering
   */
  async countByUserId(userId: string, where: any): Promise<number> {
    return this.db[this.modelName].count({
      where: {
        ...where,
        userId,
      },
    });
  }

  /**
   * Create a new entity
   */
  async create(data: any): Promise<TEntity> {
    return this.db[this.modelName].create({
      data,
      select: this.select,
    }) as Promise<TEntity>;
  }

  /**
   * Update an entity by ID
   */
  async update(id: string, data: any): Promise<TEntity> {
    return this.db[this.modelName].update({
      where: { id },
      data,
      select: this.select,
    }) as Promise<TEntity>;
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string): Promise<void> {
    await this.db[this.modelName].delete({
      where: { id },
    });
  }

  /**
   * Delete multiple entities by IDs
   */
  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.db[this.modelName].deleteMany({
      where: {
        id: { in: ids },
      },
    });
    return result.count;
  }
}
