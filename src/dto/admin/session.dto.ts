import { t } from 'elysia';
import { z } from 'zod';

export const SessionResDto = t.Object({
  id: t.String(),
  userId: t.String(),
  device: t.Nullable(t.String()),
  ip: t.Nullable(t.String()),
  expired: t.Date(),
  revoked: t.Boolean(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const SessionResWithUserDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    device: t.Nullable(t.String()),
    ip: t.Nullable(t.String()),
    expired: t.Date(),
    revoked: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    user: t.Nullable(
      t.Object({
        id: t.String(),
        username: t.String(),
        name: t.Nullable(t.String()),
      }),
    ),
  }),
);

export const SessionQueryDto = z.object({
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).default(20).optional(),
  sortBy: z.enum(['createdAt', 'expired', 'revoked']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  revoked: z
    .preprocess((val) => {
      if (val === undefined || val === null) return undefined;
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
});

export type ISessionQueryDto = z.infer<typeof SessionQueryDto>;

export const RevokeSessionDto = t.Object({
  sessionIds: t.Array(t.String(), { minItems: 1 }),
});

export const SessionPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const SessionListResponseDto = t.NoValidate(
  t.Object({
    sessions: t.Array(SessionResWithUserDto),
    pagination: SessionPaginationDto,
  }),
);

export const SessionStatisticsResponseDto = t.NoValidate(
  t.Object({
    totalSessions: t.Integer(),
    activeSessions: t.Integer(),
    revokedSessions: t.Integer(),
  }),
);

export type SessionResponse = typeof SessionResDto.static;
export type SessionResponseWithUser = typeof SessionResWithUserDto.static;
export type SessionListResponse = typeof SessionListResponseDto.static;
export type SessionStatisticsResponse =
  typeof SessionStatisticsResponseDto.static;
