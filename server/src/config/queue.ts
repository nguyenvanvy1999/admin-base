import { type ConnectionOptions, type DefaultJobOptions, Queue } from 'bullmq';
import { env } from 'src/config/env';
import {
  type EmailType,
  type EnrichedAuditLogEntry,
  MAX_JOB_KEEP_COUNT,
  MAX_JOB_KEEP_SECONDS,
  QueueName,
  type SendMailMap,
} from 'src/share';

const queueConnection: ConnectionOptions = {
  url: env.REDIS_URI,
};
const queueJobOptions: DefaultJobOptions = {
  removeOnComplete: { age: MAX_JOB_KEEP_SECONDS, count: MAX_JOB_KEEP_COUNT },
  removeOnFail: { age: MAX_JOB_KEEP_SECONDS, count: MAX_JOB_KEEP_COUNT },
};

export const emailQueue = new Queue<SendMailMap, void, EmailType>(
  QueueName.Email,
  {
    connection: queueConnection,
    defaultJobOptions: queueJobOptions,
  },
);
export type IEmailQueue = typeof emailQueue;

export const auditLogQueue = new Queue<EnrichedAuditLogEntry>(
  QueueName.AuditLog,
  {
    connection: queueConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: MAX_JOB_KEEP_SECONDS,
        count: 1000,
      },
      removeOnFail: {
        age: MAX_JOB_KEEP_SECONDS * 2,
        count: 5000,
      },
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
);
export type IAuditLogQueue = typeof auditLogQueue;

export const batchLogQueue = new Queue(QueueName.BatchAuditLog, {
  connection: queueConnection,
  defaultJobOptions: queueJobOptions,
});

export interface GeoIPJobData {
  sessionId: string;
  ip: string;
}

export const geoIPQueue = new Queue<GeoIPJobData>(QueueName.GeoIP, {
  connection: queueConnection,
  defaultJobOptions: {
    ...queueJobOptions,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});
export type IGeoIPQueue = typeof geoIPQueue;

export interface ApiKeyUsageJobData {
  apiKeyId: string;
  endpoint: string;
  method: string;
  ip: string | null;
  userAgent: string | null;
  statusCode: number;
}

export const apiKeyUsageQueue = new Queue<ApiKeyUsageJobData>(
  QueueName.ApiKeyUsage,
  {
    connection: queueConnection,
    defaultJobOptions: {
      ...queueJobOptions,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
);
export type IApiKeyUsageQueue = typeof apiKeyUsageQueue;
