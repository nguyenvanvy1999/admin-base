import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated/prisma/client';
import type {
  TagOrderByWithRelationInput,
  TagWhereInput,
} from '@server/generated/prisma/models/Tag';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import { dateToIsoString } from '@server/share/utils/formatters';
import { Elysia } from 'elysia';
import type {
  IListTagsQueryDto,
  IUpsertTagDto,
  TagListResponse,
  TagResponse,
} from '../dto/tag.dto';

import { TAG_SELECT_FULL, TAG_SELECT_MINIMAL } from './selects';

type TagRecord = Prisma.TagGetPayload<{ select: typeof TAG_SELECT_FULL }>;

const formatTag = (tag: TagRecord): TagResponse => ({
  ...tag,
  description: tag.description ?? null,
  createdAt: dateToIsoString(tag.createdAt),
  updatedAt: dateToIsoString(tag.updatedAt),
});

export class TagService {
  constructor(private readonly deps: { db: IDb } = { db: prisma }) {}

  private async validateTagOwnership(userId: string, tagId: string) {
    const tag = await this.deps.db.tag.findFirst({
      where: {
        id: tagId,
        userId,
        deletedAt: null,
      },
      select: TAG_SELECT_MINIMAL,
    });
    if (!tag) {
      throwAppError(ErrorCode.TAG_NOT_FOUND, 'Tag not found');
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

    const count = await this.deps.db.tag.count({ where });

    if (count > 0) {
      throwAppError(ErrorCode.DUPLICATE_NAME, 'Tag name already exists');
    }
  }

  async upsertTag(userId: string, data: IUpsertTagDto): Promise<TagResponse> {
    if (data.id) {
      await this.validateTagOwnership(userId, data.id);
    }

    const lowerName = data.name.toLowerCase().trim();
    await this.validateUniqueName(userId, lowerName, data.id);

    if (data.id) {
      const tag = await this.deps.db.tag.update({
        where: { id: data.id },
        data: {
          name: lowerName,
          description: data.description ?? null,
        },
        select: TAG_SELECT_FULL,
      });
      return formatTag(tag);
    } else {
      const tag = await this.deps.db.tag.create({
        data: {
          userId,
          name: lowerName,
          description: data.description ?? null,
        },
        select: TAG_SELECT_FULL,
      });
      return formatTag(tag);
    }
  }

  async getTag(userId: string, tagId: string): Promise<TagResponse> {
    const tag = await this.deps.db.tag.findFirst({
      where: {
        id: tagId,
        userId,
        deletedAt: null,
      },
      select: TAG_SELECT_FULL,
    });

    if (!tag) {
      throwAppError(ErrorCode.TAG_NOT_FOUND, 'Tag not found');
    }

    return formatTag(tag);
  }

  async listTags(
    userId: string,
    query: IListTagsQueryDto = {},
  ): Promise<TagListResponse> {
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
      this.deps.db.tag.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: TAG_SELECT_FULL,
      }),
      this.deps.db.tag.count({ where }),
    ]);

    return {
      tags: tags.map(formatTag),
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

    await this.deps.db.tag.update({
      where: { id: tagId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Tag deleted successfully' };
  }

  async deleteManyTags(userId: string, ids: string[]) {
    const tags = await this.deps.db.tag.findMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      select: TAG_SELECT_MINIMAL,
    });

    if (tags.length !== ids.length) {
      throwAppError(
        ErrorCode.TAG_NOT_FOUND,
        'Some tags were not found or do not belong to you',
      );
    }

    const result = await this.deps.db.tag.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `${result.count} tag(s) deleted successfully`,
    };
  }
}

export default new Elysia().decorate('tagService', new TagService());
