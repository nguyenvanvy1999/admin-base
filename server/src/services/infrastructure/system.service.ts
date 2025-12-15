import os from 'node:os';
import { type IOtpRateLimitCache, otpRateLimitCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { type ILogger, logger } from 'src/config/logger';
import { HEALTH_STATE } from 'src/share';

type OsPort = {
  totalmem: () => number;
  freemem: () => number;
  uptime: () => number;
  loadavg: () => number[];
  cpus: () => Array<{ model?: string }>;
  arch: () => string;
  platform: () => string;
};

type BunPort = {
  spawn: typeof Bun.spawn;
  nanoseconds: typeof Bun.nanoseconds;
};

type DiskInfo = {
  total: number;
  free: number;
  used: number;
  usedPercent: number;
  totalGB: string;
  freeGB: string;
  usedGB: string;
  usedPercentStr: string;
};

export class SystemService {
  constructor(
    private readonly deps: {
      cache: IOtpRateLimitCache;
      db: IDb;
      osModule: OsPort;
      bun: BunPort;
      log: ILogger;
    } = {
      cache: otpRateLimitCache,
      db,
      osModule: os,
      bun: Bun,
      log: logger,
    },
  ) {}

  private async getDiskUsage(): Promise<number> {
    let result: ReturnType<typeof this.deps.bun.spawn> | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      result = this.deps.bun.spawn(['df', '-h', '/'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Disk usage command timeout')),
          5000,
        );
      });
      const exitCode = await Promise.race([result.exited, timeoutPromise]);
      if (exitCode !== 0) {
        this.deps.log.error(`df command failed ${exitCode}`);
        return 0;
      }
      const output = await new Response(result.stdout as ReadableStream).text();
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const parts = lastLine?.split(/\s+/) ?? [];
      const usageStr = parts[4]?.replace('%', '') || '0';
      return parseInt(usageStr) || 0;
    } catch (error) {
      this.deps.log.error(`Error getting disk usage ${error}`);
      return 0;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (result && !result.killed) {
        try {
          result.kill();
        } catch (error) {
          this.deps.log.error(`Kill child process failed ${error}`);
        }
      }
    }
  }

  private async getDiskInfo(): Promise<DiskInfo> {
    let result: ReturnType<typeof this.deps.bun.spawn> | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      result = this.deps.bun.spawn(['df', '-k', '/'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Disk info command timeout')),
          5000,
        );
      });
      const exitCode = await Promise.race([result.exited, timeoutPromise]);
      if (exitCode !== 0) {
        this.deps.log.error(`df command failed ${exitCode}`);
        throw new Error('df command failed');
      }
      const output = await new Response(result.stdout as ReadableStream).text();
      const lines = output.trim().split('\n');
      const parts = lines[1]?.split(/\s+/) ?? [];
      const total = parseInt(parts[1] ?? '0', 10) * 1024;
      const free = parseInt(parts[3] ?? '0', 10) * 1024;
      const used = total - free;
      const usedPercent = (used / total) * 100;
      return {
        total,
        free,
        used,
        usedPercent,
        totalGB: (total / 1024 / 1024 / 1024).toFixed(2),
        freeGB: (free / 1024 / 1024 / 1024).toFixed(2),
        usedGB: (used / 1024 / 1024 / 1024).toFixed(2),
        usedPercentStr: usedPercent.toFixed(2) + '%',
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (result && !result.killed) {
        try {
          result.kill();
        } catch (error) {
          this.deps.log.error(`Kill child process failed ${error}`);
        }
      }
    }
  }

  private getMemoryInfo() {
    const total = this.deps.osModule.totalmem();
    const free = this.deps.osModule.freemem();
    const used = total - free;
    const usedPercent = (used / total) * 100;
    return {
      total,
      free,
      used,
      usedPercent,
      totalMB: (total / (1024 * 1024)).toFixed(2),
      freeMB: (free / (1024 * 1024)).toFixed(2),
      usedMB: (used / (1024 * 1024)).toFixed(2),
      totalGB: (total / (1024 * 1024 * 1024)).toFixed(2),
      freeGB: (free / (1024 * 1024 * 1024)).toFixed(2),
      usedGB: (used / (1024 * 1024 * 1024)).toFixed(2),
      usedPercentStr: usedPercent.toFixed(2) + '%',
    };
  }

  private getSystemUptime(): string {
    try {
      const uptimeSeconds = this.deps.osModule.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      if (days > 0) return `${days} days, ${hours} hours, ${minutes} minutes`;
      if (hours > 0) return `${hours} hours, ${minutes} minutes`;
      return `${minutes} minutes`;
    } catch (error) {
      this.deps.log.error(`Error getting uptime ${error}`);
      return 'Unknown';
    }
  }

  private getLoadAverage(): number {
    try {
      const loadAvg = this.deps.osModule.loadavg();
      return loadAvg[0] || 0;
    } catch (error) {
      this.deps.log.error(`Error getting load average ${error}`);
      return 0;
    }
  }

  async getSystemInfo() {
    try {
      const diskUsage = await this.getDiskUsage();
      const memoryInfo = this.getMemoryInfo();
      const uptime = this.getSystemUptime();
      const loadAverage = this.getLoadAverage();
      return {
        status: HEALTH_STATE.OK,
        data: {
          diskUsage: `${diskUsage}%`,
          uptime,
          loadAverage: loadAverage.toFixed(2),
          memory: {
            total: memoryInfo.totalGB + ' GB',
            free: memoryInfo.freeGB + ' GB',
            used: memoryInfo.usedGB + ' GB',
            usagePercent: memoryInfo.usedPercentStr,
          },
          cpu: {
            cores: this.deps.osModule.cpus().length,
            model: this.deps.osModule.cpus()[0]?.model || 'Unknown',
            architecture: this.deps.osModule.arch(),
            platform: this.deps.osModule.platform(),
          },
          runtime: {
            name: 'Bun',
            version: process.versions.bun || '',
            uptime:
              (this.deps.bun.nanoseconds() / 60_000_000_000).toFixed(2) +
              ' minutes',
          },
        },
      };
    } catch (error) {
      return { status: HEALTH_STATE.ERROR, error: (error as Error).message };
    }
  }

  checkMemHealth(thresholdPercent = 0.95) {
    try {
      const memoryInfo = this.getMemoryInfo();
      const usedPercent = memoryInfo.usedPercent / 100;
      if (usedPercent >= thresholdPercent) {
        return {
          status: HEALTH_STATE.ERROR,
          error: 'Memory usage exceeded threshold',
        };
      }
      return {
        status: HEALTH_STATE.OK,
        freeMB: memoryInfo.freeMB,
        totalMB: memoryInfo.totalMB,
      };
    } catch (error) {
      return { status: HEALTH_STATE.ERROR, error: (error as Error).message };
    }
  }

  async checkDiskHealth(thresholdPercent = 0.95) {
    try {
      const diskInfo = await this.getDiskInfo();
      const usedPercent = diskInfo.usedPercent / 100;
      if (usedPercent >= thresholdPercent) {
        return {
          status: HEALTH_STATE.ERROR,
          error: 'Disk usage exceeded threshold',
        };
      }
      return {
        status: HEALTH_STATE.OK,
        freeGB: diskInfo.freeGB,
        totalGB: diskInfo.totalGB,
        usedPercent: diskInfo.usedPercentStr,
      };
    } catch (error) {
      return { status: HEALTH_STATE.ERROR, error: (error as Error).message };
    }
  }

  async checkRedisHealth() {
    try {
      await this.deps.cache.set('healthcheck', true);
      const value = await this.deps.cache.get('healthcheck');
      return { status: value ? HEALTH_STATE.OK : HEALTH_STATE.ERROR };
    } catch (error) {
      return { status: HEALTH_STATE.ERROR, error };
    }
  }

  async checkDbHealth() {
    try {
      await this.deps.db.$queryRaw`SELECT 1`;
      return { status: HEALTH_STATE.OK };
    } catch (error) {
      return { status: HEALTH_STATE.ERROR, error };
    }
  }

  async getHealthCheck() {
    try {
      const [memory, redis, db, disk] = await Promise.all([
        this.checkMemHealth(),
        this.checkRedisHealth(),
        this.checkDbHealth(),
        this.checkDiskHealth(),
      ]);
      return {
        status: HEALTH_STATE.OK,
        details: { memory, redis, db, disk },
      };
    } catch (error) {
      return {
        status: HEALTH_STATE.ERROR,
        details: null,
        error,
      };
    }
  }
}

export const systemService = new SystemService();
