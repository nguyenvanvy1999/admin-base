import type { Prisma } from '@server/generated/prisma';
import { prisma } from '@server/libs/db';
import { authorize, has } from '@server/service/auth/authorization';
import { sessionService } from '@server/service/auth/session.service';
import { castToRes } from '@server/share';
import type { AppAuthMeta } from '@server/share/type';
import { Elysia, t } from 'elysia';
import { RevokeSessionDto, SessionQueryDto, SessionResDto } from '../dtos';

function ResWrapper<T>(schema: T): T {
  return t.Object({
    data: schema as any,
  }) as T;
}

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
