import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  EntityOrderByWithRelationInput,
  EntityWhereInput,
  Prisma,
} from '@server/generated';
import {
  DB_PREFIX,
  ERROR_MESSAGES,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import type {
  IListEntitiesQueryDto,
  IUpsertEntityDto,
} from '../dto/entity.dto';
import {
  type OwnershipValidatorService,
  ownershipValidatorService,
} from './base/ownership-validator.service';

import { ENTITY_SELECT_FULL, ENTITY_SELECT_MINIMAL } from './selects';

const mapEntity = (
  entity: Prisma.EntityGetPayload<{
    select: typeof ENTITY_SELECT_FULL;
  }>,
) => ({
  ...entity,
  created: entity.created.toISOString(),
  modified: entity.modified.toISOString(),
});

export class EntityService {
  constructor(
    private readonly deps: {
      db: IDb;
      idUtil: IdUtil;
      ownershipValidator: OwnershipValidatorService;
    } = { db: prisma, idUtil, ownershipValidator: ownershipValidatorService },
  ) {}

  private async validateEntityOwnership(userId: string, entityId: string) {
    await this.deps.ownershipValidator.validateEntityOwnership(
      userId,
      entityId,
    );
    const entity = await this.deps.db.entity.findFirst({
      where: {
        id: entityId,
        userId,
      },
      select: ENTITY_SELECT_MINIMAL,
    });
    if (!entity) {
      throwAppError(
        ErrorCode.ENTITY_NOT_FOUND,
        ERROR_MESSAGES.ENTITY_NOT_FOUND,
      );
    }
    return entity;
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    const where: EntityWhereInput = {
      userId,
      name,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.deps.db.entity.count({ where });

    if (count > 0) {
      throwAppError(ErrorCode.DUPLICATE_NAME, 'Entity name already exists');
    }
  }

  async upsertEntity(userId: string, data: IUpsertEntityDto) {
    if (data.id) {
      await this.validateEntityOwnership(userId, data.id);
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
          id: this.deps.idUtil.dbId(DB_PREFIX.ENTITY),
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
