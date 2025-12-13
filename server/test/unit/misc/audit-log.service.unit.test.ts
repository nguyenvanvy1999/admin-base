import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
} from 'bun:test';
import { AuditLogsService } from 'src/service/audit-logs/audit-logs.service';
import { ACTIVITY_TYPE, LOG_LEVEL } from 'src/share';
import { AuditLogFixtures } from 'test/fixtures';
import { TestDataGenerator, TestLifecycle } from 'test/utils';
import type { QueueInstanceMock } from 'test/utils/mocks/bullmq';

describe('auditLogService (BullMQ)', () => {
  let auditLogService: AuditLogsService;
  let queueSpies: QueueInstanceMock;

  beforeEach(async () => {
    const queue = await import('src/config/queue');
    queueSpies = queue.auditLogQueue as unknown as QueueInstanceMock;
    queueSpies.add.mockReset();
    queueSpies.addBulk.mockReset();

    auditLogService = new AuditLogsService({
      db: {} as any,
      queue: queueSpies as any,
    });
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  const activityTypes = Object.values(ACTIVITY_TYPE);

  const logLevels = Object.values(LOG_LEVEL);

  describe('push', () => {
    it('should push single audit log entry to BullMQ queue', async () => {
      const entry = AuditLogFixtures.createEntry({ userId: 'user-123' });

      const result = await auditLogService.push(entry);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(queueSpies.add).toHaveBeenCalledTimes(1);
      expect(queueSpies.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({
          type: ACTIVITY_TYPE.LOGIN,
          payload: { action: 'login' },
          userId: 'user-123',
          level: 'info',
          logId: expect.any(String),
          timestamp: expect.any(Date),
        }),
        expect.objectContaining({
          jobId: expect.any(String),
        }),
      );
    });

    it('should handle BullMQ queue.add errors', () => {
      const entry = AuditLogFixtures.createEntry();
      const queueError = new Error('Queue connection failed');
      queueSpies.add.mockRejectedValueOnce(queueError);

      expect(auditLogService.push(entry)).rejects.toThrow(
        'Queue connection failed',
      );
    });

    it('should generate unique job ID for each push', async () => {
      const entry = AuditLogFixtures.createEntry();

      const id1 = await auditLogService.push(entry);
      const id2 = await auditLogService.push(entry);

      expect(id1).not.toBe(id2);
      expect(queueSpies.add).toHaveBeenCalledTimes(2);
    });

    it('should set default values for optional fields', async () => {
      const entry = AuditLogFixtures.createEntry();

      await auditLogService.push(entry);

      expect(queueSpies.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({
          level: 'info',
          userId: undefined,
          sessionId: undefined,
          ip: undefined,
          userAgent: undefined,
          requestId: undefined,
          traceId: undefined,
          correlationId: undefined,
        }),
        expect.any(Object),
      );
    });

    it('should preserve all provided fields', async () => {
      const entry = AuditLogFixtures.createFullEntry();

      await auditLogService.push(entry);

      expect(queueSpies.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({
          type: ACTIVITY_TYPE.LOGIN,
          level: LOG_LEVEL.INFO,
          userId: 'user-123',
          sessionId: 'session-456',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-789',
          traceId: 'trace-101',
          correlationId: 'corr-202',
        }),
        expect.any(Object),
      );
    });

    it('should handle different activity types', async () => {
      for (const type of activityTypes) {
        const entry = AuditLogFixtures.createEntry({ type });
        await auditLogService.push(entry);
      }

      expect(queueSpies.add).toHaveBeenCalledTimes(activityTypes.length);
    });

    it('should handle different log levels', async () => {
      for (const level of logLevels) {
        const entry = AuditLogFixtures.createEntry({ level });
        await auditLogService.push(entry);
      }

      expect(queueSpies.add).toHaveBeenCalledTimes(logLevels.length);
    });
  });

  describe('mapData', () => {
    it('should generate a string logId and embed it into enrichedEntry', () => {
      const entry = AuditLogFixtures.createEntry({ userId: 'user-xyz' });
      const { enrichedEntry, logId } = auditLogService.mapData(entry);

      expect(typeof logId).toBe('string');
      expect(enrichedEntry.logId).toBe(logId);
      expect(enrichedEntry.type).toBe(ACTIVITY_TYPE.LOGIN);
      expect(enrichedEntry.payload).toEqual({ action: 'login' });
      expect(enrichedEntry.userId).toBe('user-xyz');
    });

    it('should set default level to info and timestamp to current time when absent', () => {
      const entry = AuditLogFixtures.createEntry();
      const before = new Date();
      const { enrichedEntry } = auditLogService.mapData(entry);
      const after = new Date();

      expect(enrichedEntry.level).toBe(LOG_LEVEL.INFO);
      expect(enrichedEntry.timestamp).toBeInstanceOf(Date);
      expect(enrichedEntry.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(enrichedEntry.timestamp.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('should preserve provided optional fields exactly (including null/undefined)', () => {
      const entry = AuditLogFixtures.createEntry({
        userId: null,
        sessionId: undefined,
        ip: null,
        userAgent: undefined,
        requestId: null,
        traceId: undefined,
        correlationId: null,
      });

      const { enrichedEntry } = auditLogService.mapData(entry);

      expect(enrichedEntry.userId).toBeNull();
      expect(enrichedEntry.sessionId).toBeUndefined();
      expect(enrichedEntry.ip).toBeNull();
      expect(enrichedEntry.userAgent).toBeUndefined();
      expect(enrichedEntry.requestId).toBeNull();
      expect(enrichedEntry.traceId).toBeUndefined();
      expect(enrichedEntry.correlationId).toBeNull();
    });

    it('should respect provided level and timestamp when present', () => {
      const ts = TestDataGenerator.generateDate();
      const entry = AuditLogFixtures.createEntry({
        level: LOG_LEVEL.ERROR,
        timestamp: ts,
      });
      const { enrichedEntry } = auditLogService.mapData(entry);

      expect(enrichedEntry.level).toBe(LOG_LEVEL.ERROR);
      expect(enrichedEntry.timestamp).toBe(ts);
    });
  });

  describe('pushBatch', () => {
    it('should push multiple audit log entries in batch', async () => {
      const entries = [
        AuditLogFixtures.createEntry({ userId: 'user-1' }),
        AuditLogFixtures.createEntry({
          type: 'USER_LOGOUT',
          payload: { action: 'logout' },
          userId: 'user-2',
        }),
        AuditLogFixtures.createEntry({
          type: 'TRANSACTION_CREATE',
          payload: { amount: 100 },
          userId: 'user-3',
        }),
      ];

      const result = await auditLogService.pushBatch(entries);

      expect(result).toHaveLength(3);
      expect(queueSpies.addBulk).toHaveBeenCalledTimes(1);
      const bulkArg = queueSpies.addBulk.mock.calls[0]?.[0];
      expect(Array.isArray(bulkArg)).toBe(true);
      expect(bulkArg).toHaveLength(3);
      expect(result.every((id: string) => typeof id === 'string')).toBe(true);
    });

    it('should handle empty batch', async () => {
      const entries: any[] = [];

      const result = await auditLogService.pushBatch(entries);

      expect(result).toEqual([]);
      expect(queueSpies.add).not.toHaveBeenCalled();
      expect(queueSpies.addBulk).not.toHaveBeenCalled();
    });

    it('should handle single entry in batch', async () => {
      const entries = [AuditLogFixtures.createEntry()];

      const result = await auditLogService.pushBatch(entries);

      expect(result).toHaveLength(1);
      expect(queueSpies.addBulk).toHaveBeenCalledTimes(1);
      const bulkArg = queueSpies.addBulk.mock.calls[0]?.[0];
      expect(Array.isArray(bulkArg)).toBe(true);
      expect(bulkArg).toHaveLength(1);
    });

    it('should handle large batch', async () => {
      const entries = Array.from({ length: 100 }, (_, i) =>
        AuditLogFixtures.createEntry({
          payload: { action: 'login', index: i },
          userId: `user-${i}`,
        }),
      );

      const result = await auditLogService.pushBatch(entries);

      expect(result).toHaveLength(100);
      expect(queueSpies.addBulk).toHaveBeenCalledTimes(1);
      const bulkArg = queueSpies.addBulk.mock.calls[0]?.[0];
      expect(Array.isArray(bulkArg)).toBe(true);
      expect(bulkArg).toHaveLength(100);
    });

    it('should handle queue errors in batch', () => {
      const entries = [
        AuditLogFixtures.createEntry(),
        AuditLogFixtures.createEntry({
          type: 'USER_LOGOUT',
          payload: { action: 'logout' },
        }),
      ];
      const queueError = new Error('Queue connection failed');
      queueSpies.addBulk.mockRejectedValueOnce(queueError);

      expect(auditLogService.pushBatch(entries)).rejects.toThrow(
        'Queue connection failed',
      );
    });

    it('should process batch entries concurrently', async () => {
      const entries = [
        AuditLogFixtures.createEntry(),
        AuditLogFixtures.createEntry({
          type: 'USER_LOGOUT',
          payload: { action: 'logout' },
        }),
      ];

      const result = await auditLogService.pushBatch(entries);

      expect(result).toHaveLength(2);
      expect(queueSpies.addBulk).toHaveBeenCalledTimes(1);
      const bulkArg = queueSpies.addBulk.mock.calls[0]?.[0];
      expect(Array.isArray(bulkArg)).toBe(true);
      expect(bulkArg).toHaveLength(2);
    });
  });

  describe('type safety and integration', () => {
    it('should have correct type signatures', () => {
      expectTypeOf(auditLogService.push).toBeFunction();
      expectTypeOf(auditLogService.pushBatch).toBeFunction();
      expectTypeOf(auditLogService.mapData).toBeFunction();
    });

    it('should handle all activity types correctly', async () => {
      for (const type of activityTypes) {
        const entry = AuditLogFixtures.createEntry({
          type,
          payload: { action: 'test' },
        });

        const result = await auditLogService.push(entry);
        expect(typeof result).toBe('string');
      }

      expect(queueSpies.add).toHaveBeenCalledTimes(activityTypes.length);
    });

    it('should handle all log levels correctly', async () => {
      for (const level of logLevels) {
        const entry = AuditLogFixtures.createEntry({ level });

        const result = await auditLogService.push(entry);
        expect(typeof result).toBe('string');
      }

      expect(queueSpies.add).toHaveBeenCalledTimes(logLevels.length);
    });

    it('should handle concurrent batch operations', async () => {
      const batch1 = [
        AuditLogFixtures.createEntry(),
        AuditLogFixtures.createEntry({
          type: 'USER_LOGOUT',
          payload: { action: 'logout' },
        }),
      ];
      const batch2 = [
        AuditLogFixtures.createEntry({
          type: 'TRANSACTION_CREATE',
          payload: { amount: 100 },
        }),
        AuditLogFixtures.createEntry({
          type: 'TRANSACTION_UPDATE',
          payload: { amount: 200 },
        }),
      ];

      const [result1, result2] = await Promise.all([
        auditLogService.pushBatch(batch1),
        auditLogService.pushBatch(batch2),
      ]);

      expect(result1).toHaveLength(2);
      expect(result2).toHaveLength(2);
      expect(queueSpies.addBulk).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle complex payload objects', async () => {
      const complexPayload = {
        user: { id: '123', email: 'test@example.com' },
        transaction: { amount: 100.5, currency: 'USD' },
        metadata: { source: 'web', version: '1.0.0' },
        nested: { deep: { value: 'test' } },
      };
      const entry = AuditLogFixtures.createEntry({
        type: 'TRANSACTION_CREATE',
        payload: complexPayload,
      });

      await auditLogService.push(entry);

      expect(queueSpies.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({
          payload: complexPayload,
        }),
        expect.any(Object),
      );
    });

    it('should handle null and undefined values correctly', async () => {
      const entry = AuditLogFixtures.createEntry({
        userId: null,
        sessionId: undefined,
        ip: null,
        userAgent: undefined,
        requestId: null,
        traceId: undefined,
        correlationId: null,
      });

      await auditLogService.push(entry);

      expect(queueSpies.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({
          userId: null,
          sessionId: undefined,
          ip: null,
          userAgent: undefined,
          requestId: null,
          traceId: undefined,
          correlationId: null,
        }),
        expect.any(Object),
      );
    });

    it('should use current timestamp when not provided', async () => {
      const entry = AuditLogFixtures.createEntry();

      await auditLogService.push(entry);

      expect(queueSpies.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
        expect.any(Object),
      );
    });
  });
});
