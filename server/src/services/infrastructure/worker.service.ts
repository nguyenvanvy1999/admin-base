import type { Job, Queue } from 'bullmq';
import { Worker, type WorkerOptions } from 'bullmq';
import { SQL } from 'bun';
import { db, type IDb } from 'src/config/db';
import { env } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import type { ApiKeyUsageJobData, GeoIPJobData } from 'src/config/queue';
import {
  auditLogQueue,
  batchLogQueue,
  type IAuditLogQueue,
} from 'src/config/queue';
import {
  type AuditLogCategory,
  AuditLogVisibility,
  LogType,
} from 'src/generated';
import type { AuditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import type { EmailService } from 'src/services/mail/email.service';
import { emailService } from 'src/services/mail/email.service';
import {
  type GeoIPService,
  geoIPService,
  type IdempotencyService,
  idempotencyService,
  type LockingService,
  lockingService,
} from 'src/services/misc';
import {
  EmailType,
  type EnrichedAuditLogEntry,
  LOG_LEVEL,
  QueueName,
  type SendMailMap,
} from 'src/share';
import {
  type ApiKeyValidationService,
  apiKeyValidationService,
} from '../api-keys/api-key-validation.service';

const WORKER_NAME = 'audit-log-batch-worker';
const JOB_NAME = 'scheduled-flush';

interface BufferedLog {
  id: string;
  payload: object;
  description?: string | null;
  level: string;
  log_type: LogType;
  category?: AuditLogCategory | null;
  visibility: AuditLogVisibility;
  event_type?: string | null;
  severity?: string | null;
  user_id?: string | null;
  subject_user_id?: string | null;
  session_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_display?: object | null;
  ip?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  trace_id?: string | null;
  correlation_id?: string | null;
  resolved?: boolean;
  resolved_at?: Date | null;
  resolved_by?: string | null;
  occurred_at: Date;
  created: Date;
}

export class WorkerService {
  constructor(
    private readonly deps: {
      db: IDb;
      emailService: EmailService;
      auditLogService: AuditLogsService;
      geoIPService: GeoIPService;
      lockingService: LockingService;
      idempotencyService: IdempotencyService;
      apiKeyValidationService: ApiKeyValidationService;
    } = {
      db,
      emailService,
      auditLogService: auditLogsService,
      geoIPService,
      lockingService,
      idempotencyService,
      apiKeyValidationService: apiKeyValidationService,
    },
  ) {}

  async handleEmailJob(jobName: string, data: SendMailMap): Promise<void> {
    switch (jobName) {
      case EmailType.OTP: {
        const params = data[EmailType.OTP] as SendMailMap[typeof EmailType.OTP];
        await this.deps.emailService.sendEmailOtp(
          params.email,
          params.otp,
          params.purpose,
        );
        break;
      }
      default:
        break;
    }
  }

  async handleGeoIPJob(_jobName: string, data: GeoIPJobData): Promise<void> {
    const { sessionId, ip } = data;

    const location = await this.deps.geoIPService.getLocationByIP(ip);

    if (location) {
      await this.deps.db.session.update({
        where: { id: sessionId },
        data: { location: location as any },
        select: { id: true },
      });
    }
  }

  async handleApiKeyUsageJob(job: Job<ApiKeyUsageJobData>): Promise<void> {
    const { apiKeyId, endpoint, method, ip, userAgent, statusCode } = job.data;

    await this.deps.apiKeyValidationService.logUsage(apiKeyId, {
      endpoint,
      method,
      ip,
      userAgent,
      statusCode,
    });
  }
}

export interface QueueHandler<T = any> {
  queue: QueueName;
  handler: (jobName: string, data: T) => Promise<void>;
}

export class WorkerManagerService {
  constructor(
    private readonly deps: {
      workerService: WorkerService;
      redisUri: string;
      logger: ILogger;
    } = {
      workerService: new WorkerService(),
      redisUri: env.REDIS_URI,
      logger,
    },
  ) {}

  private registerWorkerEvents(name: string, worker: Worker): void {
    worker.on('completed', () =>
      this.deps.logger.warning(`${name} worker task completed`),
    );
    worker.on('failed', (_, error, prev) => {
      this.deps.logger.error(`${name} worker failed with error: ${error}`);
      this.deps.logger.error(prev);
    });
    worker.on('error', (err) => {
      this.deps.logger.error(`${name} worker error ${err}`);
    });
  }

  getQueueHandlers(): QueueHandler[] {
    return [
      {
        queue: QueueName.Email,
        handler: (jobName: string, data: any) =>
          this.deps.workerService.handleEmailJob(jobName, data),
      },
      {
        queue: QueueName.GeoIP,
        handler: (jobName: string, data: any) =>
          this.deps.workerService.handleGeoIPJob(jobName, data),
      },
      {
        queue: QueueName.ApiKeyUsage,
        handler: (_: string, data: any) =>
          this.deps.workerService.handleApiKeyUsageJob(data),
      },
    ];
  }

  startMessageWorkers(): void {
    const queueConfig: WorkerOptions = {
      connection: { url: this.deps.redisUri },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 1000 },
    };

    const queueHandlers = this.getQueueHandlers();

    queueHandlers.forEach(({ queue, handler }) => {
      const worker = new Worker(
        queue,
        async (job: Job) => {
          try {
            await handler(job.name, job.data);
          } catch (err) {
            this.deps.logger.error(`Error processing ${queue}: ${err}`);
          }
        },
        queueConfig,
      );

      this.registerWorkerEvents(queue, worker);
      this.deps.logger.info(`Starting ${queue} worker`);
    });
  }
}

export class AuditLogWorkerService {
  private db: SQL;
  private readonly contextLogger: ReturnType<typeof logger.with>;

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
    this.contextLogger = logger.with({ workerName: WORKER_NAME });
  }

  private async flushBatchToDB(
    jobs: Job<EnrichedAuditLogEntry>[],
  ): Promise<void> {
    if (jobs.length === 0) return;

    const data: BufferedLog[] = jobs.map((job) => {
      const jobData = job.data;
      return {
        id: jobData.logId,
        payload: jobData.payload,
        description: jobData.description,
        level: jobData.level ?? LOG_LEVEL.INFO,
        log_type: jobData.logType ?? LogType.audit,
        category: (jobData.category as AuditLogCategory | undefined) ?? null,
        visibility: jobData.visibility ?? AuditLogVisibility.actor_only,
        event_type: jobData.eventType ?? null,
        severity: jobData.severity ?? null,
        user_id: jobData.userId,
        subject_user_id: jobData.subjectUserId ?? null,
        session_id: jobData.sessionId,
        entity_type: jobData.entityType,
        entity_id: jobData.entityId,
        entity_display: jobData.entityDisplay ?? null,
        ip: jobData.ip,
        user_agent: jobData.userAgent,
        request_id: jobData.requestId,
        trace_id: jobData.traceId,
        correlation_id: jobData.correlationId,
        resolved: jobData.resolved ?? false,
        resolved_at: jobData.resolvedAt ?? null,
        resolved_by: jobData.resolvedBy ?? null,
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
        this.contextLogger.error(
          `Postgres error during flush: ${err.message} {*}`,
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
        this.contextLogger.error(`Unknown DB error during flush`, { err });
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
      this.contextLogger.info(
        `Batch processing completed: ${waitingJobs.length} jobs in ${duration}ms`,
      );
    } catch (err) {
      this.contextLogger.error(`Scheduled flush failed ${err}`);
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
      this.contextLogger.error(`Job failed: ${job?.id}`, { err });
    });

    worker.on('error', (err: Error) => {
      this.contextLogger.error(`Worker error`, { err });
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

    this.contextLogger.info(
      `Scheduled flush configured: every ${this.deps.flushIntervalMs}ms`,
    );
  }

  private async gracefulShutdown(): Promise<void> {
    this.contextLogger.info(`Graceful shutdown initiated`);

    try {
      await this.processScheduledFlush();
    } catch (err) {
      this.contextLogger.error(`Final flush error`, { err });
    }

    try {
      await this.db.close();
    } catch (err) {
      this.contextLogger.warning(`DB close error`, { err });
    }

    process.exit(0);
  }

  async startWorker(): Promise<Worker> {
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());

    await this.setupScheduledFlush();

    const worker = this.createWorker();

    this.contextLogger.info(`Audit log worker started`);

    return worker;
  }
}

export const workerService = new WorkerService();
export const workerManagerService = new WorkerManagerService();
export const auditLogWorkerService = new AuditLogWorkerService();
