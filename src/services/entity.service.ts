import { prisma } from '@server/configs/db';
import type {
  EntityOrderByWithRelationInput,
  EntityWhereInput,
} from '@server/generated';
import { DB_PREFIX, ErrorCode, idUtil, throwAppError } from '@server/share';
import { deleteManyResources } from '@server/share/utils/delete-many.util';
import { calculatePagination } from '@server/share/utils/pagination.util';
import { validateUniqueNameForService } from '@server/share/utils/service.util';
import type {
  IListEntitiesQueryDto,
  IUpsertEntityDto,
} from '../dto/entity.dto';
import { BaseService } from './base/base.service';
import type { BaseServiceDependencies } from './base/service-dependencies';
import { mapEntity } from './mappers';

import { ENTITY_SELECT_FULL, ENTITY_SELECT_MINIMAL } from './selects';

export class EntityService extends BaseService {
  constructor(deps: BaseServiceDependencies = { db: prisma, idUtil }) {
    super(deps);
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    await validateUniqueNameForService({
      count: (args) => this.db.entity.count(args),
      errorCode: ErrorCode.DUPLICATE_NAME,
      errorMessage: 'Entity name already exists',
      userId,
      name,
      excludeId,
    });
  }

  async upsertEntity(userId: string, data: IUpsertEntityDto) {
    if (data.id) {
      this.validateOwnership(
        userId,
        data.id,
        ErrorCode.ENTITY_NOT_FOUND,
        'Entity not found',
      );
    }

    await this.validateUniqueName(userId, data.name, data.id);

    if (data.id) {
      const entity = await this.db.entity.update({
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
      const entity = await this.db.entity.create({
        data: {
          id: this.idUtil.dbIdWithUserId(DB_PREFIX.ENTITY, userId),
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
    const entity = await this.db.entity.findFirst({
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

    const orderBy = this.buildOrderBy<EntityOrderByWithRelationInput>(
      sortBy,
      sortOrder,
      {
        name: 'name',
        type: 'type',
        created: 'created',
      },
    ) as EntityOrderByWithRelationInput | undefined;

    const { skip, take } = calculatePagination(page, limit);

    const [entities, total] = await Promise.all([
      this.db.entity.findMany({
        where,
        orderBy,
        skip,
        take,
        select: ENTITY_SELECT_FULL,
      }),
      this.db.entity.count({ where }),
    ]);

    return {
      entities: entities.map(mapEntity),
      pagination: this.buildPaginationResponse(page, limit, total, [])
        .pagination,
    };
  }

  async deleteManyEntities(userId: string, ids: string[]) {
    return await deleteManyResources({
      db: this.db,
      model: 'entity',
      userId,
      ids,
      selectMinimal: ENTITY_SELECT_MINIMAL,
      errorCode: ErrorCode.ENTITY_NOT_FOUND,
      errorMessage: 'Some entities were not found or do not belong to you',
      resourceName: 'entity',
    });
  }
}

export const entityService = new EntityService();
