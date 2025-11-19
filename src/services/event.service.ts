import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  EventOrderByWithRelationInput,
  EventWhereInput,
} from '@server/generated';
import {
  DB_PREFIX,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import { validateUniqueNameForService } from '@server/share/utils/service.util';
import type { IListEventsQueryDto, IUpsertEventDto } from '../dto/event.dto';
import { mapEvent } from './mappers';

import { EVENT_SELECT_FULL, EVENT_SELECT_MINIMAL } from './selects';

export class EventService {
  constructor(
    private readonly deps: { db: IDb; idUtil: IdUtil } = { db: prisma, idUtil },
  ) {}

  private async validateEventOwnership(userId: string, eventId: string) {
    const event = await this.deps.db.event.findFirst({
      where: {
        id: eventId,
        userId,
      },
      select: EVENT_SELECT_MINIMAL,
    });
    if (!event) {
      throwAppError(ErrorCode.EVENT_NOT_FOUND, 'Event not found');
    }
    return event;
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    await validateUniqueNameForService({
      count: (args) => this.deps.db.event.count(args),
      errorCode: ErrorCode.DUPLICATE_NAME,
      errorMessage: 'Event name already exists',
      userId,
      name,
      excludeId,
    });
  }

  private validateDateRange(startAt: Date, endAt?: Date | null) {
    if (endAt && endAt < startAt) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'endAt must be greater than or equal to startAt',
      );
    }
  }

  async upsertEvent(userId: string, data: IUpsertEventDto) {
    if (data.id) {
      await this.validateEventOwnership(userId, data.id);
    }

    await this.validateUniqueName(userId, data.name, data.id);

    const startAt = new Date(data.startAt);
    const endAt = data.endAt ? new Date(data.endAt) : null;

    this.validateDateRange(startAt, endAt);

    if (data.id) {
      const event = await this.deps.db.event.update({
        where: { id: data.id },
        data: {
          name: data.name,
          startAt,
          endAt,
        },
        select: EVENT_SELECT_FULL,
      });
      return mapEvent(event);
    } else {
      const event = await this.deps.db.event.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.EVENT),
          userId,
          name: data.name,
          startAt,
          endAt,
        },
        select: EVENT_SELECT_FULL,
      });
      return mapEvent(event);
    }
  }

  async getEvent(userId: string, eventId: string) {
    const event = await this.deps.db.event.findFirst({
      where: {
        id: eventId,
        userId,
      },
      select: EVENT_SELECT_FULL,
    });

    if (!event) {
      throwAppError(ErrorCode.EVENT_NOT_FOUND, 'Event not found');
    }

    return mapEvent(event);
  }

  async listEvents(userId: string, query: IListEventsQueryDto) {
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

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.deps.db.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: EVENT_SELECT_FULL,
      }),
      this.deps.db.event.count({ where }),
    ]);

    return {
      events: events.map(mapEvent),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteManyEvents(userId: string, ids: string[]) {
    const events = await this.deps.db.event.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: EVENT_SELECT_MINIMAL,
    });

    if (events.length !== ids.length) {
      throwAppError(
        ErrorCode.EVENT_NOT_FOUND,
        'Some events were not found or do not belong to you',
      );
    }

    await this.deps.db.event.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return {
      success: true,
      message: `${ids.length} event(s) deleted successfully`,
    };
  }
}

export const eventService = new EventService();
