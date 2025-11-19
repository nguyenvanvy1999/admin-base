import { prisma } from '@server/configs/db';
import type {
  EventOrderByWithRelationInput,
  EventWhereInput,
} from '@server/generated';
import { DB_PREFIX, ErrorCode, idUtil, throwAppError } from '@server/share';
import { deleteManyResources } from '@server/share/utils/delete-many.util';
import { calculatePagination } from '@server/share/utils/pagination.util';
import { validateUniqueNameForService } from '@server/share/utils/service.util';
import dayjs from 'dayjs';
import type { IListEventsQueryDto, IUpsertEventDto } from '../dto/event.dto';
import { BaseService } from './base/base.service';
import type { BaseServiceDependencies } from './base/service-dependencies';
import { mapEvent } from './mappers';

import { EVENT_SELECT_FULL, EVENT_SELECT_MINIMAL } from './selects';

export class EventService extends BaseService {
  constructor(deps: BaseServiceDependencies = { db: prisma, idUtil }) {
    super(deps);
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    await validateUniqueNameForService({
      count: (args) => this.db.event.count(args),
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
      this.validateOwnership(
        userId,
        data.id,
        ErrorCode.EVENT_NOT_FOUND,
        'Event not found',
      );
    }

    await this.validateUniqueName(userId, data.name, data.id);

    const startAt = dayjs(data.startAt).toDate();
    const endAt = data.endAt ? dayjs(data.endAt).toDate() : null;

    this.validateDateRange(startAt, endAt);

    if (data.id) {
      const event = await this.db.event.update({
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
      const event = await this.db.event.create({
        data: {
          id: this.idUtil.dbIdWithUserId(DB_PREFIX.EVENT, userId),
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
    const event = await this.db.event.findFirst({
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
        where.startAt.gte = dayjs(startAtFrom).toDate();
      }
      if (startAtTo) {
        where.startAt.lte = dayjs(startAtTo).toDate();
      }
    }

    if (endAtFrom || endAtTo) {
      where.endAt = {};
      if (endAtFrom) {
        where.endAt.gte = dayjs(endAtFrom).toDate();
      }
      if (endAtTo) {
        where.endAt.lte = dayjs(endAtTo).toDate();
      }
    }

    const orderBy = this.buildOrderBy<EventOrderByWithRelationInput>(
      sortBy,
      sortOrder,
      {
        name: 'name',
        startAt: 'startAt',
        endAt: 'endAt',
        created: 'created',
      },
    ) as EventOrderByWithRelationInput | undefined;

    const { skip, take } = calculatePagination(page, limit);

    const [events, total] = await Promise.all([
      this.db.event.findMany({
        where,
        orderBy,
        skip,
        take,
        select: EVENT_SELECT_FULL,
      }),
      this.db.event.count({ where }),
    ]);

    return {
      events: events.map(mapEvent),
      pagination: this.buildPaginationResponse(page, limit, total, [])
        .pagination,
    };
  }

  deleteManyEvents(userId: string, ids: string[]) {
    return deleteManyResources({
      db: this.db,
      model: 'event',
      userId,
      ids,
      selectMinimal: EVENT_SELECT_MINIMAL,
      errorCode: ErrorCode.EVENT_NOT_FOUND,
      errorMessage: 'Some events were not found or do not belong to you',
      resourceName: 'event',
    });
  }
}

export const eventService = new EventService();
