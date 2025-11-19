import { prisma } from '@server/configs/db';
import type {
  TagOrderByWithRelationInput,
  TagWhereInput,
} from '@server/generated';
import { DB_PREFIX, ErrorCode, idUtil, throwAppError } from '@server/share';
import { deleteManyResources } from '@server/share/utils/delete-many.util';
import { calculatePagination } from '@server/share/utils/pagination.util';
import { validateUniqueNameForService } from '@server/share/utils/service.util';
import type {
  IListTagsQueryDto,
  IUpsertTagDto,
  TagListResponse,
  TagResponse,
} from '../dto/tag.dto';
import { BaseService } from './base/base.service';
import type { BaseServiceDependencies } from './base/service-dependencies';
import { mapTag } from './mappers';

import { TAG_SELECT_FULL, TAG_SELECT_MINIMAL } from './selects';

export class TagService extends BaseService {
  constructor(deps: BaseServiceDependencies = { db: prisma, idUtil }) {
    super(deps);
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    await validateUniqueNameForService({
      count: (args) => this.db.tag.count(args),
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
      this.validateOwnership(
        userId,
        data.id,
        ErrorCode.TAG_NOT_FOUND,
        'Tag not found',
      );
    }

    const lowerName = data.name.toLowerCase().trim();
    await this.validateUniqueName(userId, lowerName, data.id);

    if (data.id) {
      const tag = await this.db.tag.update({
        where: { id: data.id },
        data: {
          name: lowerName,
          description: data.description ?? null,
        },
        select: TAG_SELECT_FULL,
      });
      return mapTag(tag);
    } else {
      const tag = await this.db.tag.create({
        data: {
          id: this.idUtil.dbIdWithUserId(DB_PREFIX.TAG, userId),
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
    const tag = await this.db.tag.findFirst({
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

    const orderBy = this.buildOrderBy<TagOrderByWithRelationInput>(
      sortBy,
      sortOrder,
      {
        name: 'name',
        created: 'created',
      },
    ) as TagOrderByWithRelationInput | undefined;

    const { skip, take } = calculatePagination(page, limit);

    const [tags, total] = await Promise.all([
      this.db.tag.findMany({
        where,
        orderBy,
        skip,
        take,
        select: TAG_SELECT_FULL,
      }),
      this.db.tag.count({ where }),
    ]);

    return {
      tags: tags.map(mapTag),
      pagination: this.buildPaginationResponse(page, limit, total, [])
        .pagination,
    };
  }

  async deleteManyTags(userId: string, ids: string[]) {
    return await deleteManyResources({
      db: this.db,
      model: 'tag',
      userId,
      ids,
      selectMinimal: TAG_SELECT_MINIMAL,
      errorCode: ErrorCode.TAG_NOT_FOUND,
      errorMessage: 'Some tags were not found or do not belong to you',
      resourceName: 'tag',
    });
  }
}

export const tagService = new TagService();
