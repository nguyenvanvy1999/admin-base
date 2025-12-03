import type { Job, Queue } from 'bullmq';
import { Worker } from 'bullmq';
import { SQL } from 'bun';
import { env } from 'src/config/env';
import { logger } from 'src/config/logger';
import {
  auditLogQueue,
  batchLogQueue,
  type IAuditLogQueue,
} from 'src/config/queue';
import { type AuditLogEntry, LOG_LEVEL, QueueName } from 'src/share';

const WORKER_NAME = 'audit-log-batch-worker';
const JOB_NAME = 'scheduled-flush';

interface BufferedLog {
  id: string;
  payload: object;
  level: string;
  log_type: string;
  user_id?: string | null;
  session_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  trace_id?: string | null;
  correlation_id?: string | null;
  occurred_at: Date;
  created: Date;
}

export class AuditLogWorkerService {
  private db: SQL;

  constructor(
    private readonly deps: {
      auditLogQueue: IAuditLogQueue;
      batchLogQueue: Queue;
      dbUri: string;
      redisUri: string;
      flushIntervalMs: number;
    } = {
      auditLogQueue,
      batchLogQueue,
      dbUri: env.POSTGRESQL_URI,
      redisUri: env.REDIS_URI,
      flushIntervalMs: env.AUDIT_LOG_FLUSH_INTERVAL_MS,
    },
  ) {
    this.db = new SQL(this.deps.dbUri);
  }

  private async flushBatchToDB(jobs: Job<AuditLogEntry>[]): Promise<void> {
    if (jobs.length === 0) return;

    const data: BufferedLog[] = jobs.map((job) => {
      const jobData = job.data as AuditLogEntry & {
        logId: string;
        timestamp: Date;
      };
      return {
        id: jobData.logId,
        payload: jobData.payload,
        level: jobData.level ?? LOG_LEVEL.INFO,
        log_type: jobData.type,
        user_id: jobData.userId,
        session_id: jobData.sessionId,
        ip: jobData.ip,
        user_agent: jobData.userAgent,
        request_id: jobData.requestId,
        trace_id: jobData.traceId,
        correlation_id: jobData.correlationId,
        occurred_at: jobData.timestamp,
        created: new Date(),
      };
    });

    try {
      await this.db.begin(async (tx) => {
        const query = tx`INSERT INTO audit_logs ${tx(data)} ON CONFLICT (id) DO NOTHING`;
        await query.execute();
      });
    } catch (err: unknown) {
      if (err instanceof SQL.PostgresError) {
        logger.error(
          `[${WORKER_NAME}] Postgres error during flush: ${err.message} {*}`,
          {
            pgCode: err.code,
            detail: err.detail,
            hint: err.hint,
            schema: err.schema,
            table: err.table,
            constraint: err.constraint,
          },
        );
      } else {
        logger.error(`[${WORKER_NAME}] Unknown DB error during flush`, { err });
      }
      throw err;
    }
  }

  async processScheduledFlush(): Promise<void> {
    const startTime = Date.now();

    try {
      const waitingJobs = await this.deps.auditLogQueue.getWaiting(0, -1);
      if (waitingJobs.length === 0) {
        return;
      }

      await this.flushBatchToDB(waitingJobs);

      await Promise.all(waitingJobs.map((job) => job.remove()));

      const duration = Date.now() - startTime;
      logger.info(
        `[${WORKER_NAME}] Batch processing completed: ${waitingJobs.length} jobs in ${duration}ms`,
      );
    } catch (err) {
      logger.error(`[${WORKER_NAME}] Scheduled flush failed ${err}`);
      throw err;
    }
  }

  createWorker(): Worker {
    const worker = new Worker(
      QueueName.BatchAuditLog,
      async (job: Job) => {
        if (job.name === JOB_NAME) {
          await this.processScheduledFlush();
        }
      },
      {
        connection: { url: this.deps.redisUri },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 1000 },
      },
    );

    worker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error(`[${WORKER_NAME}] Job failed: ${job?.id}`, { err });
    });

    worker.on('error', (err: Error) => {
      logger.error(`[${WORKER_NAME}] Worker error`, { err });
    });

    return worker;
  }

  async setupScheduledFlush(): Promise<void> {
    await this.deps.batchLogQueue.add(
      JOB_NAME,
      { worker: WORKER_NAME },
      {
        repeat: { every: this.deps.flushIntervalMs },
        jobId: 'audit-log-scheduled-flush',
      },
    );

    logger.info(
      `[${WORKER_NAME}] Scheduled flush configured: every ${this.deps.flushIntervalMs}ms`,
    );
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info(`[${WORKER_NAME}] Graceful shutdown initiated`);

    try {
      await this.processScheduledFlush();
    } catch (err) {
      logger.error(`[${WORKER_NAME}] Final flush error`, { err });
    }

    try {
      await this.db.close();
    } catch (err) {
      logger.warning(`[${WORKER_NAME}] DB close error`, { err });
    }

    process.exit(0);
  }

  async startWorker(): Promise<Worker> {
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());

    await this.setupScheduledFlush();

    const worker = this.createWorker();

    logger.info(`[${WORKER_NAME}] Audit log worker started`, {});

    return worker;
  }
}

export const auditLogWorkerService = new AuditLogWorkerService();
