import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { IDb } from 'src/config/db';
import { SessionService } from 'src/service/auth/session.service';
import { TestLifecycle } from 'test/utils';
import {
  createPrismaMock,
  type PrismaMockClient,
} from 'test/utils/mocks/prisma';

type SessionModelMock = {
  findMany: ReturnType<typeof mock>;
  updateMany: ReturnType<typeof mock>;
};

describe('SessionService', () => {
  const userId = 'user-1';
  const defaultSessions = [{ id: 'session-1' }, { id: 'session-2' }];
  let mockDb: PrismaMockClient & { session: SessionModelMock };
  let service: SessionService;

  beforeEach(() => {
    const baseDb = createPrismaMock();
    const sessionModel: SessionModelMock = {
      findMany: mock(async () => defaultSessions),
      updateMany: mock(async () => ({ count: 0 })),
    };
    mockDb = { ...baseDb, session: sessionModel } as PrismaMockClient & {
      session: SessionModelMock;
    };
    service = new SessionService({ db: mockDb as unknown as IDb });
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  it('does not call updateMany when no active sessions are found', async () => {
    mockDb.session.findMany.mockResolvedValueOnce([]);

    await service.revoke(userId);

    expect(mockDb.session.findMany).toHaveBeenCalledWith({
      where: {
        createdById: userId,
        revoked: { not: { equals: true } },
      },
      select: { id: true },
    });
    expect(mockDb.session.updateMany).not.toHaveBeenCalled();
  });

  it('revokes all active sessions when sessions exist', async () => {
    await service.revoke(userId);

    expect(mockDb.session.findMany).toHaveBeenCalledWith({
      where: {
        createdById: userId,
        revoked: { not: { equals: true } },
      },
      select: { id: true },
    });
    expect(mockDb.session.updateMany).toHaveBeenCalledWith({
      where: { id: { in: defaultSessions.map((session) => session.id) } },
      data: { revoked: true },
    });
  });

  it('applies sessionIds filter and revokes only returned sessions', async () => {
    const targetSessionIds = ['session-2', 'session-3'];
    const sessionsFromDb = [{ id: 'session-2' }];
    mockDb.session.findMany.mockResolvedValueOnce(sessionsFromDb);

    await service.revoke(userId, targetSessionIds);

    expect(mockDb.session.findMany).toHaveBeenCalledWith({
      where: {
        createdById: userId,
        revoked: { not: { equals: true } },
        id: { in: targetSessionIds },
      },
      select: { id: true },
    });
    expect(mockDb.session.updateMany).toHaveBeenCalledWith({
      where: { id: { in: sessionsFromDb.map((session) => session.id) } },
      data: { revoked: true },
    });
  });
});
