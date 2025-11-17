import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { EVENT_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type EventRecord = Prisma.EventGetPayload<{
  select: typeof EVENT_SELECT_FULL;
}>;

export class EventRepository extends BaseRepository<
  typeof prisma.event,
  EventRecord,
  typeof EVENT_SELECT_FULL
> {
  constructor() {
    super(prisma.event, EVENT_SELECT_FULL);
  }

  /**
   * Find event by name and user ID (specific method)
   */
  async findByNameAndUserId(
    name: string,
    userId: string,
  ): Promise<EventRecord | null> {
    return prisma.event.findFirst({
      where: { name, userId },
      select: this.select,
    });
  }
}

export const eventRepository = new EventRepository();
