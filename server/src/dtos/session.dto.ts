import { t } from 'elysia';
import { DateRangeCreatedDto, type WithPermissionContext } from 'src/share';

export const SessionPaginateDto = t.Intersect([
  t.Object({
    take: t.Integer({ minimum: 1, example: 20 }),
    cursor: t.Optional(t.String({ example: '123' })),
    revoked: t.Optional(t.Boolean()),
    ip: t.Optional(t.String()),
    userIds: t.Optional(
      t.Array(t.String(), {
        minItems: 1,
        maxItems: 100,
        description: 'Filter by any of the provided user ids.',
      }),
    ),
  }),
  DateRangeCreatedDto,
]);

export const SessionPagingResDto = t.Object({
  docs: t.Array(
    t.Object({
      id: t.String(),
      created: t.Date({ format: 'date-time' }),
      createdById: t.String(),
      expired: t.Date(),
      revoked: t.Boolean(),
      ip: t.Nullable(t.String()),
      device: t.String(),
      lastActivityAt: t.Nullable(
        t.Date({
          format: 'date-time',
        }),
      ),
    }),
  ),
  hasNext: t.Boolean(),
  nextCursor: t.Optional(t.String()),
});

export type SessionListParams = WithPermissionContext<
  typeof SessionPaginateDto.static
>;
