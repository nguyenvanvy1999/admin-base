import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import {
  DeleteManyEventsDto,
  EventDeleteResponseDto,
  EventDto,
  EventListResponseDto,
  ListEventsQueryDto,
  UpsertEventDto,
} from '../dto/event.dto';
import eventService from '../services/event.service';
import { castToRes, ResWrapper } from '../share';

const EVENT_DETAIL = {
  tags: ['Event'],
  security: [{ JwtAuth: [] }],
};

const eventController = new Elysia().group(
  '/events',
  {
    detail: {
      tags: ['Event'],
      description:
        'Event management endpoints for creating, reading, updating, and deleting events.',
    },
  },
  (group) =>
    group
      .use(eventService)
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body, eventService }) => {
          return castToRes(
            await eventService.upsertEvent(currentUser.id, body),
          );
        },
        {
          detail: {
            ...EVENT_DETAIL,
            summary: 'Create or update event',
            description:
              'Create a new event or update an existing event for the authenticated user. If an event ID is provided, it will update the existing event; otherwise, it creates a new one.',
          },
          body: UpsertEventDto,
          response: {
            200: ResWrapper(EventDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params, eventService }) => {
          return castToRes(
            await eventService.getEvent(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...EVENT_DETAIL,
            summary: 'Get event by ID',
            description:
              'Retrieve detailed information about a specific event by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(EventDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, query, eventService }) => {
          return castToRes(
            await eventService.listEvents(currentUser.id, query),
          );
        },
        {
          detail: {
            ...EVENT_DETAIL,
            summary: 'List all events',
            description:
              'Get a paginated list of all events belonging to the authenticated user. Supports filtering by name, date range, and sorting.',
          },
          query: ListEventsQueryDto,
          response: {
            200: ResWrapper(EventListResponseDto),
          },
        },
      )
      .delete(
        '/:id',
        async ({ currentUser, params, eventService }) => {
          return castToRes(
            await eventService.deleteEvent(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...EVENT_DETAIL,
            summary: 'Delete event',
            description:
              'Soft delete an event by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(EventDeleteResponseDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, body, eventService }) => {
          return castToRes(
            await eventService.deleteManyEvents(currentUser.id, body.ids),
          );
        },
        {
          detail: {
            ...EVENT_DETAIL,
            summary: 'Delete many events',
            description:
              'Soft delete multiple events by their IDs. This action cannot be undone.',
          },
          body: DeleteManyEventsDto,
          response: {
            200: ResWrapper(EventDeleteResponseDto),
          },
        },
      ),
);

export default eventController;
