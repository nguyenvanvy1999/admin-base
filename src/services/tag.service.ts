import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  TagOrderByWithRelationInput,
  TagWhereInput,
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
  IListTagsQueryDto,
  IUpsertTagDto,
  TagListResponse,
  TagResponse,
} from '../dto/tag.dto';
import { mapTag } from './mappers';

import { TAG_SELECT_FULL, TAG_SELECT_MINIMAL } from './selects';

export class TagService {
  constructor(
    private readonly deps: { db: IDb; idUtil: IdUtil } = { db: prisma, idUtil },
  ) {}

  private validateTagOwnership(userId: string, tagId: string): void {
    const extractedUserId = this.deps.idUtil.extractUserIdFromId(tagId);
    if (!extractedUserId || extractedUserId !== userId) {
      throwAppError(ErrorCode.TAG_NOT_FOUND, 'Tag not found');
    }
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    await validateUniqueNameForService({
      count: (args) => this.deps.db.tag.count(args),
      errorCode: ErrorCode.DUPLICATE_NAME,
      errorMessage: 'Tag name already exists',
      userId,
      name,
      excludeId,
      normalizeName: (n) => n.toLowerCase().trim(),
    });
  }

  async upsertTag(userId: string, data: IUpsertTagDto): Promise<TagResponse> {
    if (data.id) {
      this.validateTagOwnership(userId, data.id);
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
      return mapTag(tag);
    } else {
      const tag = await this.deps.db.tag.create({
        data: {
          id: this.deps.idUtil.dbIdWithUserId(DB_PREFIX.TAG, userId),
          userId,
          name: lowerName,
          description: data.description ?? null,
        },
        select: TAG_SELECT_FULL,
      });
      return mapTag(tag);
    }
  }

  async getTag(userId: string, tagId: string): Promise<TagResponse> {
    const tag = await this.deps.db.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
      select: TAG_SELECT_FULL,
    });

    if (!tag) {
      throwAppError(ErrorCode.TAG_NOT_FOUND, 'Tag not found');
    }

    return mapTag(tag);
  }

  async listTags(
    userId: string,
    query: IListTagsQueryDto,
  ): Promise<TagListResponse> {
    const {
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: TagWhereInput = {
      userId,
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
    } else if (sortBy === 'created') {
      orderBy.created = sortOrder;
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
      tags: tags.map(mapTag),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteManyTags(userId: string, ids: string[]) {
    const tags = await this.deps.db.tag.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: TAG_SELECT_MINIMAL,
    });

    if (tags.length !== ids.length) {
      throwAppError(
        ErrorCode.TAG_NOT_FOUND,
        'Some tags were not found or do not belong to you',
      );
    }

    await this.deps.db.tag.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return {
      success: true,
      message: `${ids.length} tag(s) deleted successfully`,
    };
  }
}

export const tagService = new TagService();
