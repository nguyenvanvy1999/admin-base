import { type Job, Worker, type WorkerOptions } from 'bullmq';
import { env } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import { QueueName } from 'src/share';
import type { WorkerService } from './worker.service';
import { workerService } from './worker.service';

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
      workerService,
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

export const workerManagerService = new WorkerManagerService();
