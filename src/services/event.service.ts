import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  EventOrderByWithRelationInput,
  EventWhereInput,
  Prisma,
} from '@server/generated';
import {
  type EventRepository,
  eventRepository,
} from '@server/repositories/event.repository';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import { dateFormatter } from '@server/share/utils/service.util';
import type {
  EventListResponse,
  EventResponse,
  IListEventsQueryDto,
  IUpsertEventDto,
} from '../dto/event.dto';
import { BaseService } from './base/base.service';
import type { CacheService } from './base/cache.service';
import { cacheService } from './base/cache.service';
import {
  type OwnershipValidatorService,
  ownershipValidatorService,
} from './base/ownership-validator.service';
import type { EVENT_SELECT_FULL } from './selects';

type EventRecord = Prisma.EventGetPayload<{
  select: typeof EVENT_SELECT_FULL;
}>;

/**
 * Event service
 * Manages user-defined events for tracking purposes
 */
export class EventService extends BaseService<
  EventRecord,
  IUpsertEventDto,
  EventResponse,
  EventListResponse,
  EventRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: EventRepository;
      ownershipValidator: OwnershipValidatorService;
      idUtil: IdUtil;
      cache: CacheService;
    } = {
      db: prisma,
      repository: eventRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, {
      entityName: 'Event',
      dbPrefix: DB_PREFIX.EVENT,
    });
  }

  /**
   * Format event for response
   */
  protected formatEntity(event: EventRecord): EventResponse {
    return {
      ...event,
      startAt: dateFormatter.toIsoStringRequired(event.startAt),
      endAt: dateFormatter.toIsoString(event.endAt),
      created: dateFormatter.toIsoStringRequired(event.created),
      modified: dateFormatter.toIsoStringRequired(event.modified),
    };
  }

  /**
   * Validate unique name for an event
   */
  protected async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const where: EventWhereInput = {
      userId,
      name,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.deps.db.event.count({ where });

    if (count > 0) {
      throwAppError(ErrorCode.DUPLICATE_NAME, 'Event name already exists');
    }
  }

  /**
   * Validate date range
   */
  private validateDateRange(startAt: Date, endAt?: Date | null) {
    if (endAt && endAt < startAt) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'endAt must be greater than or equal to startAt',
      );
    }
  }

  /**
   * Create or update event
   */
  async upsert(userId: string, data: IUpsertEventDto): Promise<EventResponse> {
    if (data.id) {
      await this.validateOwnership(userId, data.id);
    }

    await this.validateUniqueName(userId, data.name, data.id);

    const startAt = new Date(data.startAt);
    const endAt = data.endAt ? new Date(data.endAt) : null;

    this.validateDateRange(startAt, endAt);

    const payload = {
      name: data.name,
      startAt,
      endAt,
    };

    if (data.id) {
      const event = await this.deps.repository.update(data.id, payload);
      return this.formatEntity(event);
    }

    const event = await this.deps.repository.create({
      ...payload,
      id: this.deps.idUtil.dbId(this.config.dbPrefix),
      userId,
    });

    return this.formatEntity(event);
  }

  /**
   * Get a single event by ID
   */
  async getEvent(userId: string, eventId: string): Promise<EventResponse> {
    const event = await this.deps.repository.findByIdAndUserId(eventId, userId);

    if (!event) {
      throwAppError(ErrorCode.EVENT_NOT_FOUND, 'Event not found');
    }

    return this.formatEntity(event);
  }

  /**
   * List events with pagination and filtering
   */
  async list(
    userId: string,
    query: IListEventsQueryDto,
  ): Promise<EventListResponse> {
    const {
      search,
      startAtFrom,
      startAtTo,
      endAtFrom,
      endAtTo,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: EventWhereInput = {
      userId,
    };

    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    if (startAtFrom || startAtTo) {
      where.startAt = {};
      if (startAtFrom) {
        where.startAt.gte = new Date(startAtFrom);
      }
      if (startAtTo) {
        where.startAt.lte = new Date(startAtTo);
      }
    }

    if (endAtFrom || endAtTo) {
      where.endAt = {};
      if (endAtFrom) {
        where.endAt.gte = new Date(endAtFrom);
      }
      if (endAtTo) {
        where.endAt.lte = new Date(endAtTo);
      }
    }

    const orderBy: EventOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'startAt') {
      orderBy.startAt = sortOrder;
    } else if (sortBy === 'endAt') {
      orderBy.endAt = sortOrder;
    } else if (sortBy === 'created') {
      orderBy.created = sortOrder;
    }

    const skip = this.calculateSkip(page, limit);

    const [events, total] = await Promise.all([
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
      events: events.map((e) => this.formatEntity(e)),
      pagination: this.buildPaginationResponse(page, limit, total),
    };
  }

  /**
   * Legacy method name for backward compatibility
   */
  async upsertEvent(
    userId: string,
    data: IUpsertEventDto,
  ): Promise<EventResponse> {
    return this.upsert(userId, data);
  }

  /**
   * Legacy method name for backward compatibility
   */
  async listEvents(
    userId: string,
    query: IListEventsQueryDto,
  ): Promise<EventListResponse> {
    return this.list(userId, query);
  }

  /**
   * Legacy method name for backward compatibility
   */
  async deleteManyEvents(userId: string, ids: string[]) {
    return this.deleteMany(userId, ids);
  }
}

export const eventService = new EventService();
