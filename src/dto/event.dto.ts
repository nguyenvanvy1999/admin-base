import { t } from 'elysia';
import { z } from 'zod';
import {
  createListQueryDto,
  DeleteManyDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

export const UpsertEventDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime().optional(),
});

export const ListEventsQueryDto = createListQueryDto({
  search: z.string().optional(),
  startAtFrom: z.iso.datetime().optional(),
  startAtTo: z.iso.datetime().optional(),
  endAtFrom: z.iso.datetime().optional(),
  endAtTo: z.iso.datetime().optional(),
  sortBy: z.enum(['name', 'startAt', 'endAt', 'createdAt']).optional(),
});

export const DeleteManyEventsDto = DeleteManyDto;

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

export const EventListResponseDto = t.NoValidate(
  t.Object({
    events: t.Array(EventDto),
    pagination: PaginationDto,
  }),
);

export const EventDeleteResponseDto = DeleteResponseDto;

export type EventResponse = typeof EventDto.static;
export type EventListResponse = typeof EventListResponseDto.static;
export type EventDeleteResponse = typeof EventDeleteResponseDto.static;
