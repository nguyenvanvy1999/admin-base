import { t } from 'elysia';
import { DtoFields, PaginationReqDto } from 'src/share';

export const CreateNotificationDto = t.Object({
  userId: t.String({ minLength: 1 }),
  templateId: t.Optional(t.String()),
  type: t.Union([
    t.Literal('email'),
    t.Literal('sms'),
    t.Literal('push'),
    t.Literal('in_app'),
  ]),
  subject: t.Optional(t.String()),
  content: t.String({ minLength: 1 }),
  metadata: t.Optional(t.Any()),
});

export const NotificationItemDto = t.Object({
  id: t.String(),
  userId: t.String(),
  templateId: t.Nullable(t.String()),
  type: t.Union([
    t.Literal('email'),
    t.Literal('sms'),
    t.Literal('push'),
    t.Literal('in_app'),
  ]),
  status: t.Union([
    t.Literal('pending'),
    t.Literal('sent'),
    t.Literal('failed'),
    t.Literal('read'),
  ]),
  subject: t.Nullable(t.String()),
  content: t.String(),
  metadata: t.Nullable(t.Any()),
  readAt: t.Nullable(t.Date()),
  sentAt: t.Nullable(t.Date()),
  failedAt: t.Nullable(t.Date()),
  error: t.Nullable(t.String()),
  created: t.Date(),
});

export const PaginateNotificationResDto = t.Object({
  docs: t.Array(NotificationItemDto),
  count: t.Number(),
});

export const NotificationDetailResDto = t.Intersect([
  NotificationItemDto,
  t.Object({
    user: t.Optional(
      t.Object({
        id: t.String(),
        email: t.String(),
      }),
    ),
  }),
]);

export const NotificationPaginationDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    userId: t.Optional(t.String()),
    userIds: t.Optional(t.Array(t.String())),
    type: t.Optional(
      t.Union([
        t.Literal('email'),
        t.Literal('sms'),
        t.Literal('push'),
        t.Literal('in_app'),
      ]),
    ),
    status: t.Optional(
      t.Union([
        t.Literal('pending'),
        t.Literal('sent'),
        t.Literal('failed'),
        t.Literal('read'),
      ]),
    ),
    search: DtoFields.search,
  }),
]);

export const MarkNotificationReadDto = t.Object({
  ids: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
});
