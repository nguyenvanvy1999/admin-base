import type { RedisClient } from 'bun';
import { db, type IDb } from 'src/config/db';
import { type ILogger, logger } from 'src/config/logger';
import { emailQueue, type IEmailQueue, teleQueue } from 'src/config/queue';
import { redis } from 'src/config/redis';

type ITeleQueue = typeof teleQueue;

export class GracefulShutdownService {
  constructor(
    private readonly deps: {
      db: IDb;
      logger: ILogger;
      redis: RedisClient;
      emailQueue: IEmailQueue;
      teleQueue: ITeleQueue;
    } = {
      db,
      logger,
      redis,
      emailQueue,
      teleQueue,
    },
  ) {}

  async disconnectDatabase(): Promise<void> {
    try {
      this.deps.logger.info('🔄 Disconnecting database...');
      await this.deps.db.$disconnect();
      this.deps.logger.info('✅ Database disconnected successfully');
    } catch (error) {
      this.deps.logger.error(`❌ Database disconnect failed: ${error}`);
      this.deps.logger.error(`Database error details: ${error}`);
      if (error instanceof Error) {
        this.deps.logger.error(`Database error stack: ${error.stack}`);
      }
    }
  }

  closeRedis(): void {
    try {
      this.deps.logger.info('🔄 Closing Redis connection...');
      this.deps.redis.close();
      this.deps.logger.info('✅ Redis closed successfully');
    } catch (error) {
      this.deps.logger.error(`❌ Redis close failed: ${error}`);
    }
  }

  async closeQueues(): Promise<void> {
    try {
      this.deps.logger.info('🔄 Closing message queues...');
      await Promise.allSettled([
        this.deps.teleQueue.close(),
        this.deps.emailQueue.close(),
      ]);
      this.deps.logger.info('✅ All queues closed successfully');
    } catch (error) {
      this.deps.logger.error(`❌ Queue close failed: ${error}`);
      this.deps.logger.error(`Queue error details: ${error}`);
      if (error instanceof Error) {
        this.deps.logger.error(`Queue error stack: ${error.stack}`);
      }
    }
  }

  async shutdown(): Promise<void> {
    this.deps.logger.info('🔄 Starting graceful shutdown...');

    try {
      await this.closeQueues();
      this.closeRedis();
      await this.disconnectDatabase();

      this.deps.logger.info('✅ Graceful shutdown completed successfully');
    } catch (error) {
      this.deps.logger.error(`❌ Graceful shutdown failed: ${error}`);
      this.deps.logger.error(`Shutdown error details: ${error}`);
      if (error instanceof Error) {
        this.deps.logger.error(`Shutdown error stack: ${error.stack}`);
      }
    }
  }

  setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      this.deps.logger.info(
        `📡 Received ${signal}, starting graceful shutdown...`,
      );
      try {
        await this.shutdown();
        this.deps.logger.info('✅ Shutdown completed, exiting with code 0');
        process.exit(0);
      } catch (error) {
        this.deps.logger.error(`❌ Shutdown failed: ${error}`);
        this.deps.logger.error(`Shutdown error details: ${error}`);
        if (error instanceof Error) {
          this.deps.logger.error(`Shutdown error stack: ${error.stack}`);
        }
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', async (error) => {
      this.deps.logger.error(`💥 Uncaught Exception: ${error}`);
      this.deps.logger.error(`Uncaught exception details: ${error}`);
      this.deps.logger.error(`Uncaught exception stack: ${error.stack}`);
      this.deps.logger.error(`Uncaught exception name: ${error.name}`);
      this.deps.logger.error(`Uncaught exception message: ${error.message}`);

      try {
        await this.shutdown();
        this.deps.logger.info(
          '✅ Shutdown completed after uncaught exception, exiting with code 1',
        );
        process.exit(1);
      } catch (shutdownError) {
        this.deps.logger.error(
          `❌ Shutdown failed after uncaught exception: ${shutdownError}`,
        );
        process.exit(1);
      }
    });

    process.on('unhandledRejection', async (reason, promise) => {
      this.deps.logger.error(
        `💥 Unhandled Rejection at: ${promise}, reason: ${reason}`,
      );
      this.deps.logger.error(`Unhandled rejection details: ${reason}`);
      if (reason instanceof Error) {
        this.deps.logger.error(`Unhandled rejection stack: ${reason.stack}`);
        this.deps.logger.error(`Unhandled rejection name: ${reason.name}`);
        this.deps.logger.error(
          `Unhandled rejection message: ${reason.message}`,
        );
      }

      try {
        await this.shutdown();
        this.deps.logger.info(
          '✅ Shutdown completed after unhandled rejection, exiting with code 1',
        );
        process.exit(1);
      } catch (shutdownError) {
        this.deps.logger.error(
          `❌ Shutdown failed after unhandled rejection: ${shutdownError}`,
        );
        process.exit(1);
      }
    });

    this.deps.logger.info('✅ Graceful shutdown handlers configured');
  }
}

export const gracefulShutdownService = new GracefulShutdownService();
