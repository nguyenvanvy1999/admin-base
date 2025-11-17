import { anyOf, authorize, has } from '@server/services/auth/authorization';
import { sessionService } from '@server/services/auth/session.service';
import type { AppAuthMeta } from '@server/share';
import { castToRes, ResWrapper } from '@server/share';
import { Elysia, t } from 'elysia';
import {
  type ISessionQueryDto,
  RevokeSessionDto,
  SessionListResponseDto,
  SessionQueryDto,
  SessionStatisticsResponseDto,
} from '../../dto/admin';

export const sessionController = new Elysia<'sessions', AppAuthMeta>({
  prefix: 'sessions',
})
  .use(authorize(anyOf(has('SESSION.VIEW'), has('SESSION.VIEW_ALL'))))
  .get(
    '/',
    async ({ query, currentUser }) => {
      const isAdmin = currentUser.permissions.includes('SESSION.VIEW_ALL');
      const queryParams = query as ISessionQueryDto;

      if (!isAdmin && queryParams.userId) {
        queryParams.userId = undefined;
      }

      const result = await sessionService.listSessions(
        currentUser.id,
        isAdmin,
        queryParams,
      );

      return castToRes(result);
    },
    {
      query: SessionQueryDto,
      response: {
        200: ResWrapper(SessionListResponseDto),
      },
    },
  )
  .get(
    '/statistics',
    async () => {
      const result = await sessionService.getStatistics();
      return castToRes(result);
    },
    {
      response: {
        200: ResWrapper(SessionStatisticsResponseDto),
      },
    },
  )
  .use(authorize(anyOf(has('SESSION.REVOKE'), has('SESSION.REVOKE_ALL'))))
  .post(
    '/revoke',
    async ({ body: { sessionIds }, currentUser, query }) => {
      const isAdmin = currentUser.permissions.includes('SESSION.REVOKE_ALL');
      const queryParams = query as { userId?: string };
      const targetUserId =
        isAdmin && queryParams.userId ? queryParams.userId : undefined;

      await sessionService.revoke(
        currentUser.id,
        isAdmin,
        sessionIds,
        targetUserId,
      );
      return castToRes(null);
    },
    {
      body: RevokeSessionDto,
      query: t.Object({
        userId: t.Optional(t.String()),
      }),
      response: {
        200: ResWrapper(t.Null()),
      },
    },
  )
  .post(
    '/revoke-many',
    async ({ body: { sessionIds }, currentUser, query }) => {
      const isAdmin = currentUser.permissions.includes('SESSION.REVOKE_ALL');
      const queryParams = query as { userId?: string };
      const targetUserId =
        isAdmin && queryParams.userId ? queryParams.userId : undefined;

      await sessionService.revoke(
        currentUser.id,
        isAdmin,
        sessionIds,
        targetUserId,
      );
      return castToRes(null);
    },
    {
      body: RevokeSessionDto,
      query: t.Object({
        userId: t.Optional(t.String()),
      }),
      response: {
        200: ResWrapper(t.Null()),
      },
    },
  );
