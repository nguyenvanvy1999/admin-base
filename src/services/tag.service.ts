import type {
  TagOrderByWithRelationInput,
  TagWhereInput,
} from '@server/generated/prisma/models/Tag';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type { IListTagsQueryDto, IUpsertTagDto } from '../dto/tag.dto';

export class TagService {
  private async validateTagOwnership(userId: string, tagId: string) {
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
        deletedAt: null,
      },
    });
    if (!tag) {
      throw new Error('Tag not found');
    }
    return tag;
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    const lowerName = name.toLowerCase().trim();
    const where: TagWhereInput = {
      userId,
      name: lowerName,
      deletedAt: null,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await prisma.tag.findFirst({ where });

    if (existing) {
      throw new Error('Tag name already exists');
    }
  }

  async upsertTag(userId: string, data: IUpsertTagDto) {
    if (data.id) {
      await this.validateTagOwnership(userId, data.id);
    }

    const lowerName = data.name.toLowerCase().trim();
    await this.validateUniqueName(userId, lowerName, data.id);

    if (data.id) {
      return prisma.tag.update({
        where: { id: data.id },
        data: {
          name: lowerName,
          description: data.description ?? null,
        },
      });
    } else {
      return prisma.tag.create({
        data: {
          userId,
          name: lowerName,
          description: data.description ?? null,
        },
      });
    }
  }

  async getTag(userId: string, tagId: string) {
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
        deletedAt: null,
      },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    return tag;
  }

  async listTags(userId: string, query: IListTagsQueryDto = {}) {
    const {
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: TagWhereInput = {
      userId,
      deletedAt: null,
    };

    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const orderBy: TagOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.tag.count({ where }),
    ]);

    return {
      tags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteTag(userId: string, tagId: string) {
    await this.validateTagOwnership(userId, tagId);

    await prisma.tag.update({
      where: { id: tagId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Tag deleted successfully' };
  }
}

export default new Elysia().decorate('tagService', new TagService());
