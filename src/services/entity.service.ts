import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  EntityOrderByWithRelationInput,
  EntityWhereInput,
  Prisma,
} from '@server/generated';
import {
  type EntityRepository,
  entityRepository,
} from '@server/repositories/entity.repository';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import { dateFormatter } from '@server/share/utils/service.util';
import type {
  EntityListResponse,
  EntityResponse,
  IListEntitiesQueryDto,
  IUpsertEntityDto,
} from '../dto/entity.dto';
import { BaseService } from './base/base.service';
import type { CacheService } from './base/cache.service';
import { cacheService } from './base/cache.service';
import type {
  ICacheService,
  IDb,
  IIdUtil,
  IOwnershipValidatorService,
} from './base/interfaces';
import { ownershipValidatorService } from './base/ownership-validator.service';
import type { ENTITY_SELECT_FULL } from './selects';

type EntityRecord = Prisma.EntityGetPayload<{
  select: typeof ENTITY_SELECT_FULL;
}>;

/**
 * Entity service
 * Manages financial entities (companies, individuals, etc.)
 */
export class EntityService extends BaseService<
  EntityRecord,
  IUpsertEntityDto,
  EntityResponse,
  EntityListResponse,
  EntityRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: EntityRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
    } = {
      db: prisma,
      repository: entityRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, {
      entityName: 'Entity',
      dbPrefix: DB_PREFIX.ENTITY,
    });
  }

  /**
   * Format entity for response
   */
  protected formatEntity(entity: EntityRecord): EntityResponse {
    return {
      ...entity,
      created: dateFormatter.toIsoStringRequired(entity.created),
      modified: dateFormatter.toIsoStringRequired(entity.modified),
    };
  }

  /**
   * Validate unique name
   */
  protected async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const where: EntityWhereInput = {
      name,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.deps.repository.countByUserId(userId, where);

    if (count > 0) {
      throwAppError(ErrorCode.DUPLICATE_NAME, 'Entity name already exists');
    }
  }

  /**
   * Create or update entity
   */
  async upsert(
    userId: string,
    data: IUpsertEntityDto,
  ): Promise<EntityResponse> {
    if (data.id) {
      await this.validateOwnership(userId, data.id);
    }

    await this.validateUniqueName(userId, data.name, data.id);

    if (data.id) {
      const entity = await this.deps.repository.update(data.id, {
        name: data.name,
        type: data.type,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        note: data.note ?? null,
      });
      return this.formatEntity(entity);
    }

    const entity = await this.deps.repository.create({
      id: this.deps.idUtil.dbId(this.config.dbPrefix),
      userId,
      name: data.name,
      type: data.type,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      note: data.note ?? null,
    });

    return this.formatEntity(entity);
  }

  /**
   * List entities with pagination and filtering
   */
  async list(
    userId: string,
    query: IListEntitiesQueryDto,
  ): Promise<EntityListResponse> {
    const {
      type,
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: EntityWhereInput = {
      userId,
    };

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const orderBy: EntityOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'type') {
      orderBy.type = sortOrder;
    } else if (sortBy === 'created') {
      orderBy.created = sortOrder;
    }

    const skip = this.calculateSkip(page, limit);

    const [entities, total] = await Promise.all([
      this.deps.repository.findManyByUserId(
        userId,
        where,
        orderBy,
        skip,
        limit,
      ),
      this.deps.repository.countByUserId(userId, where),
    ]);

    return {
      entities: entities.map((e) => this.formatEntity(e)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }

  /**
   * Legacy method name for backward compatibility
   */
  async upsertEntity(
    userId: string,
    data: IUpsertEntityDto,
  ): Promise<EntityResponse> {
    return this.upsert(userId, data);
  }

  /**
   * Legacy method name for backward compatibility
   */
  async listEntities(
    userId: string,
    query: IListEntitiesQueryDto,
  ): Promise<EntityListResponse> {
    return this.list(userId, query);
  }

  /**
   * Legacy method name for backward compatibility
   */
  async deleteManyEntities(userId: string, ids: string[]) {
    return this.deleteMany(userId, ids);
  }
}

export const entityService = new EntityService();
