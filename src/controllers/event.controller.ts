import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  DeleteManyEventsDto,
  EventDeleteResponseDto,
  EventDto,
  EventListResponseDto,
  ListEventsQueryDto,
  UpsertEventDto,
} from '../dto/event.dto';
import authMacro from '../macros/auth';
import eventService from '../services/event.service';

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
      .use(authMacro)
      .post(
        '/',
        ({ user, body, eventService }) => {
          return eventService.upsertEvent(user.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...EVENT_DETAIL,
            summary: 'Create or update event',
            description:
              'Create a new event or update an existing event for the authenticated user. If an event ID is provided, it will update the existing event; otherwise, it creates a new one.',
          },
          body: UpsertEventDto,
          response: {
            200: EventDto,
          },
        },
      )
      .get(
        '/:id',
        ({ user, params, eventService }) => {
          return eventService.getEvent(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...EVENT_DETAIL,
            summary: 'Get event by ID',
            description:
              'Retrieve detailed information about a specific event by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: EventDto,
          },
        },
      )
      .get(
        '/',
        ({ user, query, eventService }) => {
          return eventService.listEvents(user.id, query);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...EVENT_DETAIL,
            summary: 'List all events',
            description:
              'Get a paginated list of all events belonging to the authenticated user. Supports filtering by name, date range, and sorting.',
          },
          query: ListEventsQueryDto,
          response: {
            200: EventListResponseDto,
          },
        },
      )
      .delete(
        '/:id',
        ({ user, params, eventService }) => {
          return eventService.deleteEvent(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...EVENT_DETAIL,
            summary: 'Delete event',
            description:
              'Soft delete an event by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: EventDeleteResponseDto,
          },
        },
      )
      .post(
        '/delete-many',
        ({ user, body, eventService }) => {
          return eventService.deleteManyEvents(user.id, body.ids);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...EVENT_DETAIL,
            summary: 'Delete many events',
            description:
              'Soft delete multiple events by their IDs. This action cannot be undone.',
          },
          body: DeleteManyEventsDto,
          response: {
            200: EventDeleteResponseDto,
          },
        },
      ),
);

export default eventController;
