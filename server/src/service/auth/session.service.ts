import { db, type IDb } from 'src/config/db';
import type { SessionWhereInput } from 'src/generated';
import type { SessionPaginateDto } from 'src/modules/admin/dtos';
import { ErrCode, NotFoundErr } from 'src/share';

type ListParams = typeof SessionPaginateDto.static & {
  currentUserId: string;
  hasViewAllPermission: boolean;
};

export class SessionService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async revoke(userId: string, sessionIds: string[] = []): Promise<void> {
    const whereCondition: SessionWhereInput = {
      createdById: userId,
      revoked: { not: { equals: true } },
    };

    if (sessionIds.length > 0) {
      whereCondition.id = { in: sessionIds };
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
    }
  }

  async list(params: ListParams) {
    const {
      created0,
      created1,
      ip,
      cursor,
      take,
      revoked,
      currentUserId,
      hasViewAllPermission,
    } = params;

    const conditions: SessionWhereInput[] = [
      {
        created: {
          gte: new Date(created0),
          lte: new Date(created1),
        },
      },
    ];

    if (!hasViewAllPermission) {
      conditions.push({ createdById: currentUserId });
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
        ip: true,
        revoked: true,
        createdById: true,
        expired: true,
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
