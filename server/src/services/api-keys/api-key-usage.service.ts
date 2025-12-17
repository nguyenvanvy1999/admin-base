import { db, type IDb } from 'src/config/db';
import type { ApiKeyUsageWhereInput } from 'src/generated';
import { executeListQuery } from 'src/services/shared/utils';

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

  async list(params: {
    take: number;
    skip: number;
    apiKeyId?: string;
    userId?: string;
    method?: string;
    endpoint?: string;
    statusCode?: number;
    startDate?: Date;
    endDate?: Date;
    ip?: string;
    currentUserId: string;
    hasViewPermission: boolean;
  }) {
    const {
      take,
      skip,
      apiKeyId,
      userId,
      method,
      endpoint,
      statusCode,
      startDate,
      endDate,
      ip,
      currentUserId,
      hasViewPermission,
    } = params;

    const where: ApiKeyUsageWhereInput = {};

    if (apiKeyId) {
      where.apiKeyId = apiKeyId;
    }

    if (method) {
      where.method = method;
    }

    if (endpoint) {
      where.endpoint = endpoint;
    }

    if (statusCode !== undefined) {
      where.statusCode = statusCode;
    }

    if (ip) {
      where.ip = ip;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    if (!hasViewPermission) {
      where.apiKey = {
        userId: currentUserId,
      };
    } else if (userId) {
      where.apiKey = {
        userId,
      };
    }

    const result = await executeListQuery(this.deps.db.apiKeyUsage, {
      where,
      select: {
        id: true,
        apiKeyId: true,
        endpoint: true,
        method: true,
        ip: true,
        userAgent: true,
        statusCode: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take,
      skip,
    });

    return {
      docs: result.docs.map((doc) => ({
        ...doc,
        id: doc.id.toString(),
      })),
      count: result.count,
    };
  }

  async getStatsWithFilter(params: {
    apiKeyId?: string;
    userId?: string;
    method?: string;
    endpoint?: string;
    statusCode?: number;
    startDate?: Date;
    endDate?: Date;
    ip?: string;
    currentUserId: string;
    hasViewPermission: boolean;
  }): Promise<IApiKeyUsageStats> {
    const {
      apiKeyId,
      userId,
      method,
      endpoint,
      statusCode,
      startDate,
      endDate,
      ip,
      currentUserId,
      hasViewPermission,
    } = params;

    const where: ApiKeyUsageWhereInput = {};

    if (apiKeyId) {
      where.apiKeyId = apiKeyId;
    }

    if (method) {
      where.method = method;
    }

    if (endpoint) {
      where.endpoint = endpoint;
    }

    if (statusCode !== undefined) {
      where.statusCode = statusCode;
    }

    if (ip) {
      where.ip = ip;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    if (!hasViewPermission) {
      where.apiKey = {
        userId: currentUserId,
      };
    } else if (userId) {
      where.apiKey = {
        userId,
      };
    }

    const [totalCount, methodStats, endpointStats, statusCodeStats, lastUsage] =
      await Promise.all([
        this.deps.db.apiKeyUsage.count({
          where,
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['method'],
          where,
          _count: true,
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['endpoint'],
          where,
          _count: true,
        }),
        this.deps.db.apiKeyUsage.groupBy({
          by: ['statusCode'],
          where,
          _count: true,
        }),
        this.deps.db.apiKeyUsage.findFirst({
          where,
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
}

export const apiKeyUsageService = new ApiKeyUsageService();
