import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  EntityOrderByWithRelationInput,
  EntityWhereInput,
} from '@server/generated';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import { validateUniqueNameForService } from '@server/share/utils/service.util';
import type {
  IListEntitiesQueryDto,
  IUpsertEntityDto,
} from '../dto/entity.dto';
import { mapEntity } from './mappers';

import { ENTITY_SELECT_FULL, ENTITY_SELECT_MINIMAL } from './selects';

export class EntityService {
  constructor(
    private readonly deps: { db: IDb; idUtil: IdUtil } = { db: prisma, idUtil },
  ) {}

  private validateEntityOwnership(userId: string, entityId: string): void {
    const extractedUserId = this.deps.idUtil.extractUserIdFromId(entityId);
    if (!extractedUserId || extractedUserId !== userId) {
      throwAppError(ErrorCode.ENTITY_NOT_FOUND, 'Entity not found');
    }
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    await validateUniqueNameForService({
      count: (args) => this.deps.db.entity.count(args),
      errorCode: ErrorCode.DUPLICATE_NAME,
      errorMessage: 'Entity name already exists',
      userId,
      name,
      excludeId,
    });
  }

  async upsertEntity(userId: string, data: IUpsertEntityDto) {
    if (data.id) {
      this.validateEntityOwnership(userId, data.id);
    }

    await this.validateUniqueName(userId, data.name, data.id);

    if (data.id) {
      const entity = await this.deps.db.entity.update({
        where: { id: data.id },
        data: {
          name: data.name,
          type: data.type,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          note: data.note ?? null,
        },
        select: ENTITY_SELECT_FULL,
      });
      return mapEntity(entity);
    } else {
      const entity = await this.deps.db.entity.create({
        data: {
          id: this.deps.idUtil.dbIdWithUserId(DB_PREFIX.ENTITY, userId),
          userId,
          name: data.name,
          type: data.type,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          note: data.note ?? null,
        },
        select: ENTITY_SELECT_FULL,
      });
      return mapEntity(entity);
    }
  }

  async getEntity(userId: string, entityId: string) {
    const entity = await this.deps.db.entity.findFirst({
      where: {
        id: entityId,
        userId,
      },
      select: ENTITY_SELECT_FULL,
    });

    if (!entity) {
      throwAppError(ErrorCode.ENTITY_NOT_FOUND, 'Entity not found');
    }

    return mapEntity(entity);
  }

  async listEntities(userId: string, query: IListEntitiesQueryDto) {
    const { type, search, page, limit, sortBy, sortOrder } = query;

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

    const skip = (page - 1) * limit;

    const [entities, total] = await Promise.all([
      this.deps.db.entity.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: ENTITY_SELECT_FULL,
      }),
      this.deps.db.entity.count({ where }),
    ]);

    return {
      entities: entities.map(mapEntity),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteManyEntities(userId: string, ids: string[]) {
    const entities = await this.deps.db.entity.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: ENTITY_SELECT_MINIMAL,
    });

    if (entities.length !== ids.length) {
      throwAppError(
        ErrorCode.ENTITY_NOT_FOUND,
        'Some entities were not found or do not belong to you',
      );
    }

    await this.deps.db.entity.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return {
      success: true,
      message: `${ids.length} entity(ies) deleted successfully`,
    };
  }
}

export const entityService = new EntityService();
