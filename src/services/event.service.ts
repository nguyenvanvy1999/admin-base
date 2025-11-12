import type { Prisma } from '@server/generated/prisma/client';
import type {
  EventOrderByWithRelationInput,
  EventWhereInput,
} from '@server/generated/prisma/models/Event';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type { IListEventsQueryDto, IUpsertEventDto } from '../dto/event.dto';

const EVENT_SELECT_FULL = {
  id: true,
  name: true,
  startAt: true,
  endAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const EVENT_SELECT_MINIMAL = {
  id: true,
} as const;

const mapEvent = (
  event: Prisma.EventGetPayload<{
    select: typeof EVENT_SELECT_FULL;
  }>,
) => ({
  ...event,
  startAt: event.startAt.toISOString(),
  endAt: event.endAt ? event.endAt.toISOString() : null,
  createdAt: event.createdAt.toISOString(),
  updatedAt: event.updatedAt.toISOString(),
});

export class EventService {
  private async validateEventOwnership(userId: string, eventId: string) {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        userId,
        deletedAt: null,
      },
      select: EVENT_SELECT_MINIMAL,
    });
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  }

  private async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    const where: EventWhereInput = {
      userId,
      name,
      deletedAt: null,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.event.count({ where });

    if (count > 0) {
      throw new Error('Event name already exists');
    }
  }

  private validateDateRange(startAt: Date, endAt?: Date | null) {
    if (endAt && endAt < startAt) {
      throw new Error('endAt must be greater than or equal to startAt');
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
      const event = await prisma.event.update({
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
      const event = await prisma.event.create({
        data: {
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
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        userId,
        deletedAt: null,
      },
      select: EVENT_SELECT_FULL,
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return mapEvent(event);
  }

  async listEvents(userId: string, query: IListEventsQueryDto = {}) {
    const {
      search,
      startAtFrom,
      startAtTo,
      endAtFrom,
      endAtTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: EventWhereInput = {
      userId,
      deletedAt: null,
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
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: EVENT_SELECT_FULL,
      }),
      prisma.event.count({ where }),
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

  async deleteEvent(userId: string, eventId: string) {
    await this.validateEventOwnership(userId, eventId);

    await prisma.event.update({
      where: { id: eventId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Event deleted successfully' };
  }

  async deleteManyEvents(userId: string, ids: string[]) {
    const events = await prisma.event.findMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      select: EVENT_SELECT_MINIMAL,
    });

    if (events.length !== ids.length) {
      throw new Error('Some events were not found or do not belong to you');
    }

    const result = await prisma.event.updateMany({
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
      message: `${result.count} event(s) deleted successfully`,
    };
  }
}

export default new Elysia().decorate('eventService', new EventService());
