import { db, type IDb } from 'src/config/db';
import type { SessionListParams } from 'src/dtos/session.dto';
import type { SessionWhereInput } from 'src/generated';
import { detectSessionType, userResSelect } from 'src/share';
import { Session } from '../../domain/entities/session.entity';

export interface ISessionRepository {
  create(
    session: Omit<Session, 'revoked' | 'lastActivityAt'>,
  ): Promise<Session>;
  findByToken(token: string): Promise<Session | null>;
  revoke(userId: string, sessionIds?: string[]): Promise<void>;
  revokeMany(sessionIds: string[]): Promise<void>;
  list(params: SessionListParams): Promise<{
    docs: Array<{
      id: string;
      created: Date;
      createdById: string;
      expired: Date;
      revoked: boolean;
      ip: string | null;
      device: string | null;
      lastActivityAt: Date | null;
    }>;
    hasNext: boolean;
    nextCursor?: string;
  }>;
}

export class SessionRepository implements ISessionRepository {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async create(
    session: Omit<Session, 'revoked' | 'lastActivityAt'>,
  ): Promise<Session> {
    const created = await this.deps.db.session.create({
      data: {
        id: session.id,
        device: session.device || '',
        ip: session.ip,
        createdById: session.userId,
        expired: session.expired,
        token: session.token,
        deviceFingerprint: session.deviceFingerprint ?? null,
        sessionType: (session.sessionType ??
          detectSessionType(session.userAgent)) as any,
        userAgent: session.userAgent,
      },
      select: {
        id: true,
        createdById: true,
        token: true,
        expired: true,
        ip: true,
        userAgent: true,
        device: true,
        deviceFingerprint: true,
        sessionType: true,
        created: true,
        revoked: true,
        lastActivityAt: true,
      },
    });

    return new Session(
      created.id,
      created.createdById,
      created.token,
      created.expired,
      created.ip ?? '',
      created.userAgent ?? '',
      created.device,
      created.deviceFingerprint,
      created.sessionType ?? detectSessionType(created.userAgent ?? ''),
      created.created,
      created.revoked,
      created.lastActivityAt,
    );
  }

  async findByToken(token: string): Promise<Session | null> {
    const session = await this.deps.db.session.findFirst({
      where: { token },
      select: {
        id: true,
        createdById: true,
        token: true,
        expired: true,
        ip: true,
        userAgent: true,
        device: true,
        deviceFingerprint: true,
        sessionType: true,
        created: true,
        revoked: true,
        lastActivityAt: true,
        createdBy: { select: userResSelect },
      },
    });

    if (!session) return null;

    return new Session(
      session.id,
      session.createdById,
      session.token,
      session.expired,
      session.ip ?? '',
      session.userAgent ?? '',
      session.device ?? null,
      session.deviceFingerprint ?? null,
      session.sessionType ?? detectSessionType(session.userAgent ?? '') ?? null,
      session.created,
      session.revoked,
      session.lastActivityAt,
    );
  }

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

  async revokeMany(sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0) return;

    await this.deps.db.session.updateMany({
      where: {
        id: { in: sessionIds },
        revoked: { not: { equals: true } },
      },
      data: { revoked: true },
    });
  }

  async list(params: SessionListParams) {
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
}

export const sessionRepository = new SessionRepository();
