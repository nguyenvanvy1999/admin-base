import { type IDb, prisma } from '@server/configs/db';
import { type ILogger, logger } from '@server/configs/logger';
import { redis } from '@server/configs/redis';
import type { RedisClient } from 'bun';

export class GracefulShutdownService {
  constructor(
    private readonly deps: { logger: ILogger; db: IDb; redis: RedisClient } = {
      logger,
      db: prisma,
      redis,
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
      redis.close();
      this.deps.logger.info('✅ Redis closed successfully');
    } catch (error) {
      this.deps.logger.error(`❌ Redis close failed: ${error}`);
    }
  }

  async shutdown(): Promise<void> {
    this.deps.logger.info('🔄 Starting graceful shutdown...');

    try {
      // Close Redis
      this.closeRedis();

      // Finally disconnect database
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

    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
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

    // Handle unhandled promise rejections
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
