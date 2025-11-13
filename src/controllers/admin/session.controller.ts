import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated/prisma/client';
import { authorize, has } from '@server/services/auth/authorization';
import { sessionService } from '@server/services/auth/session.service';
import { castToRes, ResWrapper } from '@server/share';
import type { AppAuthMeta } from '@server/share/type';
import { Elysia, t } from 'elysia';
import {
  RevokeSessionDto,
  SessionQueryDto,
  SessionResDto,
  SessionStatisticsResponseDto,
} from '../../dto/admin';

export const sessionController = new Elysia<'sessions', AppAuthMeta>({
  prefix: 'sessions',
})
  .use(authorize(has('SESSION.VIEW')))
  .get(
    '/',
    async ({ query: { userId }, currentUser }) => {
      const targetUserId = userId || currentUser.id;
      const where: Prisma.SessionWhereInput = {
        userId: targetUserId,
      };

      const sessions = await prisma.session.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return castToRes(sessions);
    },
    {
      query: SessionQueryDto,
      response: {
        200: ResWrapper(t.Array(SessionResDto)),
      },
    },
  )
  .get(
    '/statistics',
    async () => {
      const now = new Date();

      const [totalSessions, activeSessions, revokedSessions] =
        await Promise.all([
          prisma.session.count({}),
          prisma.session.count({
            where: {
              expired: { gt: now },
              revoked: false,
            },
          }),
          prisma.session.count({
            where: {
              revoked: true,
            },
          }),
        ]);

      return castToRes({
        totalSessions,
        activeSessions,
        revokedSessions,
      });
    },
    {
      response: {
        200: ResWrapper(SessionStatisticsResponseDto),
      },
    },
  )
  .use(authorize(has('SESSION.REVOKE')))
  .post(
    '/revoke',
    async ({ body: { sessionIds }, currentUser }) => {
      await sessionService.revoke(currentUser.id, sessionIds);
      return castToRes(null);
    },
    {
      body: RevokeSessionDto,
      response: {
        200: ResWrapper(t.Null()),
      },
    },
  );
