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

    return {
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
  }
}

export const apiKeyUsageService = new ApiKeyUsageService();
