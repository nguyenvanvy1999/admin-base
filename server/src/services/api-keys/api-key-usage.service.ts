import { db, type IDb } from 'src/config/db';

export interface IApiKeyUsageStats {
  totalRequests: number;
  lastUsedAt: Date | null;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  requestsByStatusCode: Record<number, number>;
}

export class ApiKeyUsageService {
  constructor(
    private readonly deps: {
      db: IDb;
    } = {
      db,
    },
  ) {}

  async getStats(apiKeyId: string): Promise<IApiKeyUsageStats> {
    const usages = await this.deps.db.apiKeyUsage.findMany({
      where: { apiKeyId },
      select: {
        method: true,
        endpoint: true,
        statusCode: true,
        timestamp: true,
      },
    });

    const stats: IApiKeyUsageStats = {
      totalRequests: usages.length,
      lastUsedAt:
        usages.length > 0 ? usages[usages.length - 1].timestamp : null,
      requestsByMethod: {},
      requestsByEndpoint: {},
      requestsByStatusCode: {},
    };

    for (const usage of usages) {
      // Count by method
      stats.requestsByMethod[usage.method] =
        (stats.requestsByMethod[usage.method] || 0) + 1;

      // Count by endpoint
      stats.requestsByEndpoint[usage.endpoint] =
        (stats.requestsByEndpoint[usage.endpoint] || 0) + 1;

      // Count by status code
      stats.requestsByStatusCode[usage.statusCode] =
        (stats.requestsByStatusCode[usage.statusCode] || 0) + 1;
    }

    return stats;
  }

  async getStatsMultiple(
    apiKeyIds: string[],
  ): Promise<Record<string, IApiKeyUsageStats>> {
    const stats: Record<string, IApiKeyUsageStats> = {};

    for (const apiKeyId of apiKeyIds) {
      stats[apiKeyId] = await this.getStats(apiKeyId);
    }

    return stats;
  }

  async getUserStats(userId: string): Promise<IApiKeyUsageStats> {
    const usages = await this.deps.db.apiKeyUsage.findMany({
      where: {
        apiKey: {
          userId,
        },
      },
      select: {
        method: true,
        endpoint: true,
        statusCode: true,
        timestamp: true,
      },
    });

    const stats: IApiKeyUsageStats = {
      totalRequests: usages.length,
      lastUsedAt:
        usages.length > 0 ? usages[usages.length - 1].timestamp : null,
      requestsByMethod: {},
      requestsByEndpoint: {},
      requestsByStatusCode: {},
    };

    for (const usage of usages) {
      stats.requestsByMethod[usage.method] =
        (stats.requestsByMethod[usage.method] || 0) + 1;
      stats.requestsByEndpoint[usage.endpoint] =
        (stats.requestsByEndpoint[usage.endpoint] || 0) + 1;
      stats.requestsByStatusCode[usage.statusCode] =
        (stats.requestsByStatusCode[usage.statusCode] || 0) + 1;
    }

    return stats;
  }

  getRecentUsage(apiKeyId: string, limit: number = 100) {
    return this.deps.db.apiKeyUsage.findMany({
      where: { apiKeyId },
      select: {
        id: true,
        endpoint: true,
        method: true,
        ip: true,
        statusCode: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }

  getUsageByDateRange(apiKeyId: string, startDate: Date, endDate: Date) {
    return this.deps.db.apiKeyUsage.findMany({
      where: {
        apiKeyId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        method: true,
        endpoint: true,
        statusCode: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  getUsageByEndpoint(apiKeyId: string, endpoint: string) {
    return this.deps.db.apiKeyUsage.findMany({
      where: {
        apiKeyId,
        endpoint,
      },
      select: {
        method: true,
        statusCode: true,
        timestamp: true,
        ip: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async cleanupOldUsage(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.deps.db.apiKeyUsage.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

export const apiKeyUsageService = new ApiKeyUsageService();
