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
    const [totalCount, methodStats, endpointStats, statusCodeStats, lastUsage] =
      await Promise.all([
        this.deps.db.apiKeyUsage.count({
          where: { apiKeyId },
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['method'],
          where: { apiKeyId },
          _count: true,
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['endpoint'],
          where: { apiKeyId },
          _count: true,
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['statusCode'],
          where: { apiKeyId },
          _count: true,
        }),
        this.deps.db.apiKeyUsage.findFirst({
          where: { apiKeyId },
          select: { timestamp: true },
          orderBy: { timestamp: 'desc' },
        }),
      ]);

    const stats: IApiKeyUsageStats = {
      totalRequests: totalCount,
      lastUsedAt: lastUsage?.timestamp ?? null,
      requestsByMethod: methodStats.reduce(
        (acc, item) => {
          acc[item.method] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      requestsByEndpoint: endpointStats.reduce(
        (acc, item) => {
          acc[item.endpoint] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      requestsByStatusCode: statusCodeStats.reduce(
        (acc, item) => {
          acc[item.statusCode] = item._count;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };

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
    const [totalCount, methodStats, endpointStats, statusCodeStats, lastUsage] =
      await Promise.all([
        this.deps.db.apiKeyUsage.count({
          where: {
            apiKey: {
              userId,
            },
          },
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['method'],
          where: {
            apiKey: {
              userId,
            },
          },
          _count: true,
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['endpoint'],
          where: {
            apiKey: {
              userId,
            },
          },
          _count: true,
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['statusCode'],
          where: {
            apiKey: {
              userId,
            },
          },
          _count: true,
        }),
        this.deps.db.apiKeyUsage.findFirst({
          where: {
            apiKey: {
              userId,
            },
          },
          select: { timestamp: true },
          orderBy: { timestamp: 'desc' },
        }),
      ]);

    const stats: IApiKeyUsageStats = {
      totalRequests: totalCount,
      lastUsedAt: lastUsage?.timestamp ?? null,
      requestsByMethod: methodStats.reduce(
        (acc, item) => {
          acc[item.method] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      requestsByEndpoint: endpointStats.reduce(
        (acc, item) => {
          acc[item.endpoint] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      requestsByStatusCode: statusCodeStats.reduce(
        (acc, item) => {
          acc[item.statusCode] = item._count;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };

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
