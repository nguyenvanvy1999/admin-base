import type { Prisma } from '@server/generated';
import type { EVENT_SELECT_FULL } from '../selects';

export const mapEvent = (
  event: Prisma.EventGetPayload<{
    select: typeof EVENT_SELECT_FULL;
  }>,
) => ({
  ...event,
  startAt: event.startAt.toISOString(),
  endAt: event.endAt ? event.endAt.toISOString() : null,
  created: event.created.toISOString(),
  modified: event.modified.toISOString(),
});
