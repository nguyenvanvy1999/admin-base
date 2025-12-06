import { db, type IDb } from 'src/config/db';
import type { SessionWhereInput } from 'src/generated';
import type { SessionPaginateDto } from 'src/modules/admin/dtos';
import { ErrCode, NotFoundErr } from 'src/share';

type ListParams = typeof SessionPaginateDto.static & {
  currentUserId: string;
  hasViewPermission: boolean;
};

export class SessionService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async revoke(userId: string, sessionIds: string[] = []): Promise<void> {
    const whereCondition: SessionWhereInput = {
      createdById: userId,
      revoked: { not: { equals: true } },
      ...(sessionIds.length > 0 && { id: { in: sessionIds } }),
    };

    await this.deps.db.session.updateMany({
      where: whereCondition,
      data: { revoked: true },
    });
  }

  async revokeMany(sessionIds: string[] = []): Promise<void> {
    if (sessionIds.length === 0) return;

    await this.deps.db.session.updateMany({
      where: {
        id: { in: sessionIds },
        revoked: { not: { equals: true } },
      },
      data: { revoked: true },
    });
  }

  async list(params: ListParams) {
    const {
      created0,
      created1,
      ip,
      userIds,
      cursor,
      take,
      revoked,
      currentUserId,
      hasViewPermission,
    } = params;

    const conditions: SessionWhereInput[] = [
      {
        created: {
          gte: new Date(created0),
          lte: new Date(created1),
        },
      },
    ];

    if (!hasViewPermission) {
      conditions.push({ createdById: currentUserId });
    }

    if (userIds && userIds.length > 0) {
      conditions.push({ createdById: { in: userIds } });
    }

    if (ip) {
      conditions.push({ ip });
    }

    if (revoked !== undefined) {
      conditions.push({ revoked });
    }

    const sessions = await this.deps.db.session.findMany({
      select: {
        id: true,
        created: true,
        createdById: true,
        expired: true,
        revoked: true,
        ip: true,
        device: true,
        lastActivityAt: true,
      },
      where: { AND: conditions },
      take,
      orderBy: { created: 'desc' },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
    const hasNext = sessions.length === take;

    return {
      docs: sessions,
      hasNext,
      nextCursor: hasNext ? sessions[sessions.length - 1]?.id : undefined,
    };
  }

  async loadSessionById(sessionId: string): Promise<{ createdById: string }> {
    const session = await this.deps.db.session.findUnique({
      where: { id: sessionId },
      select: { createdById: true },
    });
    if (!session) {
      throw new NotFoundErr(ErrCode.ItemNotFound);
    }
    return session;
  }
}

export const sessionService = new SessionService();
