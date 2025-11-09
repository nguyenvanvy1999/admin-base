import type {
  EntityOrderByWithRelationInput,
  EntityWhereInput,
} from '@server/generated/prisma/models/Entity';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  IListEntitiesQueryDto,
  IUpsertEntityDto,
} from '../dto/entity.dto';

export class EntityService {
  private async validateEntityOwnership(userId: string, entityId: string) {
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        userId,
        deletedAt: null,
      },
    });
    if (!entity) {
      throw new Error('Entity not found');
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
      deletedAt: null,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await prisma.entity.findFirst({ where });

    if (existing) {
      throw new Error('Entity name already exists');
    }
  }

  async upsertEntity(userId: string, data: IUpsertEntityDto) {
    if (data.id) {
      await this.validateEntityOwnership(userId, data.id);
    }

    await this.validateUniqueName(userId, data.name, data.id);

    if (data.id) {
      return prisma.entity.update({
        where: { id: data.id },
        data: {
          name: data.name,
          type: data.type,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          note: data.note ?? null,
        },
      });
    } else {
      return prisma.entity.create({
        data: {
          userId,
          name: data.name,
          type: data.type,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          note: data.note ?? null,
        },
      });
    }
  }

  async getEntity(userId: string, entityId: string) {
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        userId,
        deletedAt: null,
      },
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    return entity;
  }

  async listEntities(userId: string, query: IListEntitiesQueryDto = {}) {
    const {
      type,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: EntityWhereInput = {
      userId,
      deletedAt: null,
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
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [entities, total] = await Promise.all([
      prisma.entity.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.entity.count({ where }),
    ]);

    return {
      entities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteEntity(userId: string, entityId: string) {
    await this.validateEntityOwnership(userId, entityId);

    await prisma.entity.update({
      where: { id: entityId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Entity deleted successfully' };
  }
}

export default new Elysia().decorate('entityService', new EntityService());
