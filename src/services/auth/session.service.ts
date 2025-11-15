import { currentUserCache } from '@server/configs/cache';
import { type IDb, prisma } from '@server/configs/db';
import type { ISessionQueryDto } from '@server/dto/admin/session.dto';
import type { Prisma } from '@server/generated';

export class SessionService {
  constructor(private readonly deps: { db: IDb } = { db: prisma }) {}

  async listSessions(
    currentUserId: string,
    isAdmin: boolean,
    query: ISessionQueryDto = {},
  ) {
    const {
      userId,
      page = 1,
      limit = 20,
      sortBy = 'created',
      sortOrder = 'desc',
      revoked,
    } = query;

    const where: Prisma.SessionWhereInput = {};

    if (isAdmin && userId) {
      where.userId = userId;
    } else {
      where.userId = currentUserId;
    }

    if (revoked !== undefined) {
      where.revoked = revoked;
    }

    const orderBy: Prisma.SessionOrderByWithRelationInput = {};
    if (sortBy === 'created') {
      orderBy.created = sortOrder;
    } else if (sortBy === 'expired') {
      orderBy.expired = sortOrder;
    } else if (sortBy === 'revoked') {
      orderBy.revoked = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.deps.db.session.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          device: true,
          ip: true,
          expired: true,
          revoked: true,
          created: true,
          modified: true,
          user: isAdmin
            ? {
                select: {
                  id: true,
                  username: true,
                  name: true,
                },
              }
            : undefined,
        },
      }),
      this.deps.db.session.count({ where }),
    ]);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        userId: session.userId,
        device: session.device,
        ip: session.ip,
        expired: session.expired,
        revoked: session.revoked,
        created: session.created,
        modified: session.modified,
        user: session.user
          ? {
              id: session.user.id,
              username: session.user.username,
              name: session.user.name,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async revoke(
    currentUserId: string,
    isAdmin: boolean,
    sessionIds: string[],
    targetUserId?: string,
  ): Promise<void> {
    const whereCondition: Prisma.SessionWhereInput = {
      revoked: false,
    };

    if (sessionIds.length > 0) {
      whereCondition.id = { in: sessionIds };

      if (!isAdmin) {
        whereCondition.userId = currentUserId;
      } else if (targetUserId) {
        whereCondition.userId = targetUserId;
      }
    } else {
      if (isAdmin && targetUserId) {
        whereCondition.userId = targetUserId;
      } else {
        whereCondition.userId = currentUserId;
      }
    }

    const sessions = await this.deps.db.session.findMany({
      where: whereCondition,
      select: { id: true },
    });

    if (sessions.length > 0) {
      const idsToRevoke = sessions.map((session) => session.id);
      await this.deps.db.session.updateMany({
        where: { id: { in: idsToRevoke } },
        data: { revoked: true },
      });

      await Promise.all(idsToRevoke.map((id) => currentUserCache.del(id)));
    }
  }
}

export const sessionService = new SessionService();
