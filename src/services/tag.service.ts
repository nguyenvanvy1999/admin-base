import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  Prisma,
  TagOrderByWithRelationInput,
  TagWhereInput,
} from '@server/generated';
import type { TagRepository } from '@server/repositories/tag.repository';
import { tagRepository } from '@server/repositories/tag.repository';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import { dateFormatter } from '@server/share/utils/service.util';
import type {
  IListTagsQueryDto,
  IUpsertTagDto,
  TagListResponse,
  TagResponse,
} from '../dto/tag.dto';
import { BaseService } from './base/base.service';
import type { CacheService } from './base/cache.service';
import { cacheService } from './base/cache.service';
import type { OwnershipValidatorService } from './base/ownership-validator.service';
import { ownershipValidatorService } from './base/ownership-validator.service';
import type { TAG_SELECT_FULL } from './selects';

type TagRecord = Prisma.TagGetPayload<{ select: typeof TAG_SELECT_FULL }>;

/**
 * Tag service
 * Manages tags for categorization and organization
 */
export class TagService extends BaseService<
  TagRecord,
  IUpsertTagDto,
  TagResponse,
  TagListResponse,
  TagRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: TagRepository;
      ownershipValidator: OwnershipValidatorService;
      idUtil: IdUtil;
      cache: CacheService;
    } = {
      db: prisma,
      repository: tagRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, {
      entityName: 'Tag',
      dbPrefix: DB_PREFIX.TAG,
    });
  }

  /**
   * Format tag for response
   */
  protected formatEntity(tag: TagRecord): TagResponse {
    return {
      ...tag,
      description: tag.description ?? null,
      created: dateFormatter.toIsoStringRequired(tag.created),
      modified: dateFormatter.toIsoStringRequired(tag.modified),
    };
  }

  /**
   * Validate unique name (case-insensitive)
   */
  protected async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const lowerName = name.toLowerCase().trim();
    const where: TagWhereInput = {
      userId,
      name: lowerName,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.deps.db.tag.count({ where });

    if (count > 0) {
      throwAppError(ErrorCode.DUPLICATE_NAME, 'Tag name already exists');
    }
  }

  /**
   * Create or update tag
   */
  async upsert(userId: string, data: IUpsertTagDto): Promise<TagResponse> {
    if (data.id) {
      await this.validateOwnership(userId, data.id);
    }

    const lowerName = data.name.toLowerCase().trim();
    await this.validateUniqueName(userId, lowerName, data.id);

    if (data.id) {
      const tag = await this.deps.repository.update(data.id, {
        name: lowerName,
        description: data.description ?? null,
      });
      return this.formatEntity(tag);
    }

    const tag = await this.deps.repository.create({
      id: this.deps.idUtil.dbId(this.config.dbPrefix),
      userId,
      name: lowerName,
      description: data.description ?? null,
    });

    return this.formatEntity(tag);
  }

  /**
   * List tags with pagination and filtering
   */
  async list(
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

    const skip = this.calculateSkip(page, limit);

    const [tags, total] = await Promise.all([
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
      tags: tags.map((t) => this.formatEntity(t)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }

  /**
   * Legacy method name for backward compatibility
   */
  async upsertTag(userId: string, data: IUpsertTagDto): Promise<TagResponse> {
    return this.upsert(userId, data);
  }

  /**
   * Legacy method name for backward compatibility
   */
  async listTags(
    userId: string,
    query: IListTagsQueryDto,
  ): Promise<TagListResponse> {
    return this.list(userId, query);
  }

  /**
   * Legacy method name for backward compatibility
   */
  async deleteManyTags(userId: string, ids: string[]) {
    return this.deleteMany(userId, ids);
  }
}

export const tagService = new TagService();
