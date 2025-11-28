import { auditLogQueue, type IAuditLogQueue } from 'src/config/queue';
import type { ACTIVITY_TYPE, AuditLogEntry } from 'src/share';
import { ctxStore, IdUtil, LOG_LEVEL } from 'src/share';

const JOB_NAME = 'audit-log';
export class AuditLogService {
  constructor(private readonly queue: IAuditLogQueue = auditLogQueue) {}
  mapData(entry: AuditLogEntry) {
    const logId = IdUtil.snowflakeId().toString();
    const ctx = ctxStore.getStore();

    const pickValue = <T>(value: T | undefined | null, fallback?: T) =>
      value !== undefined ? value : fallback;

    const enrichedEntry: AuditLogEntry & {
      logId: string;
      timestamp: Date;
    } = {
      ...entry,
      logId: logId,
      level: entry.level ?? LOG_LEVEL.INFO,
      timestamp: entry.timestamp ?? new Date(),
      userId: pickValue(entry.userId, ctx?.userId),
      sessionId: pickValue(entry.sessionId, ctx?.sessionId),
      ip: pickValue(entry.ip, ctx?.ip),
      userAgent: pickValue(entry.userAgent, ctx?.ua),
      requestId: pickValue(entry.requestId, ctx?.reqId),
      traceId: entry.traceId,
      correlationId: entry.correlationId,
    };

    return { enrichedEntry, logId };
  }

  async push<T extends ACTIVITY_TYPE>(
    entry: Omit<AuditLogEntry<T>, 'ip' | 'userAgent' | 'requestId'>,
  ): Promise<string> {
    const { enrichedEntry, logId } = this.mapData(entry);

    await this.queue.add(JOB_NAME, enrichedEntry, {
      jobId: logId,
    });

    return logId;
  }

  async pushBatch<T extends ACTIVITY_TYPE>(
    entries: Omit<AuditLogEntry<T>, 'ip' | 'userAgent' | 'requestId'>[],
  ): Promise<string[]> {
    if (entries.length === 0) return [];

    const jobIds: string[] = [];
    const enrichedEntries: { name: string; data: AuditLogEntry }[] = [];

    for (const entry of entries) {
      const { enrichedEntry, logId } = this.mapData(entry);
      jobIds.push(logId);
      enrichedEntries.push({ name: JOB_NAME, data: enrichedEntry });
    }

    await this.queue.addBulk(enrichedEntries);

    return jobIds;
  }
}

export const auditLogService = new AuditLogService();
