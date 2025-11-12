import { t } from 'elysia';
import { z } from 'zod';

export const UpsertEventDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime().optional(),
});

export const ListEventsQueryDto = z.object({
  search: z.string().optional(),
  startAtFrom: z.iso.datetime().optional(),
  startAtTo: z.iso.datetime().optional(),
  endAtFrom: z.iso.datetime().optional(),
  endAtTo: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).default(20).optional(),
  sortBy: z.enum(['name', 'startAt', 'endAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type IUpsertEventDto = z.infer<typeof UpsertEventDto>;
export type IListEventsQueryDto = z.infer<typeof ListEventsQueryDto>;

export const EventDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    startAt: t.String(),
    endAt: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
);

export const EventPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const EventListResponseDto = t.NoValidate(
  t.Object({
    events: t.Array(EventDto),
    pagination: EventPaginationDto,
  }),
);

export const EventDeleteResponseDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
);

export type EventResponse = typeof EventDto.static;
export type EventListResponse = typeof EventListResponseDto.static;
export type EventDeleteResponse = typeof EventDeleteResponseDto.static;
