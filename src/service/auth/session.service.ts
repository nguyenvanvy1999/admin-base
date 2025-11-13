import type { Prisma } from '@server/generated/prisma/client';
import { prisma } from '@server/libs/db';

export interface IDb {
  session: {
    findMany: (args: {
      where: Prisma.SessionWhereInput;
      select?: Prisma.SessionSelect;
    }) => Promise<any[]>;
    updateMany: (args: {
      where: Prisma.SessionWhereInput;
      data: Prisma.SessionUpdateManyMutationInput;
    }) => Promise<any>;
  };
}

export class SessionService {
  constructor(
    private readonly deps: { db: IDb } = { db: prisma as unknown as IDb },
  ) {}

  async revoke(userId: string, sessionIds: string[] = []): Promise<void> {
    const whereCondition: Prisma.SessionWhereInput = {
      userId,
      revoked: false,
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
}

export const sessionService = new SessionService();
