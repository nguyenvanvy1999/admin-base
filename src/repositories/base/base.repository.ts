import type { IDb } from '@server/configs/db';

// A generic type for Prisma model delegates (e.g., prisma.user, prisma.account)
// This ensures that the delegate has the methods we need.
type PrismaDelegate = {
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args: any) => Promise<{ count: number }>;
};

/**
 * Interface for base repository operations.
 * Provides a contract for type-safe CRUD operations.
 */
export interface IBaseRepository<TEntity> {
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
 * Base repository class providing common, type-safe CRUD operations.
 * This class now uses a Prisma delegate directly to restore type safety.
 *
 * @template TDelegate - The Prisma model delegate (e.g., prisma.user).
 * @template TEntity - The entity type returned by the delegate.
 * @template TSelect - The Prisma select object for queries.
 */
export abstract class BaseRepository<
  TDelegate extends PrismaDelegate,
  TEntity,
  TSelect,
> implements IBaseRepository<TEntity>
{
  protected constructor(
    protected readonly delegate: TDelegate,
    protected readonly select: TSelect,
  ) {}

  async findById(id: string): Promise<TEntity | null> {
    return this.delegate.findUnique({ where: { id }, select: this.select });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<TEntity | null> {
    return this.delegate.findFirst({
      where: { id, userId },
      select: this.select,
    });
  }

  async findMany(
    where: any,
    orderBy?: any,
    skip?: number,
    take?: number,
  ): Promise<TEntity[]> {
    return this.delegate.findMany({
      where,
      orderBy,
      skip,
      take,
      select: this.select,
    });
  }

  async findManyByUserId(
    userId: string,
    where: any,
    orderBy?: any,
    skip?: number,
    take?: number,
  ): Promise<TEntity[]> {
    const query = {
      where: { ...where, userId },
      orderBy,
      skip,
      take,
      select: this.select,
    };
    return this.delegate.findMany(query);
  }

  async findManyByIdsAndUserId(
    ids: string[],
    userId: string,
  ): Promise<TEntity[]> {
    return this.delegate.findMany({
      where: { id: { in: ids }, userId },
      select: this.select,
    });
  }

  async count(where: any): Promise<number> {
    return this.delegate.count({ where });
  }

  async countByUserId(userId: string, where: any): Promise<number> {
    return this.delegate.count({ where: { ...where, userId } });
  }

  async create(data: any): Promise<TEntity> {
    return this.delegate.create({ data, select: this.select });
  }

  async update(id: string, data: any): Promise<TEntity> {
    return this.delegate.update({ where: { id }, data, select: this.select });
  }

  async delete(id: string): Promise<void> {
    await this.delegate.delete({ where: { id } });
  }

  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.delegate.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }
}
