import { rateLimitConfigCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import {
  Prisma,
  type RateLimitConfigWhereInput,
  type RateLimitStrategy,
} from 'src/generated';
import type { RateLimitConfig } from './rate-limit.middleware';

const CACHE_TTL = 300;

export class RateLimitConfigService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async getConfig(routePath: string): Promise<RateLimitConfig | null> {
    const cacheKey = this.buildCacheKey(routePath);
    const cached = await rateLimitConfigCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const config = await this.deps.db.rateLimitConfig.findUnique({
        where: {
          routePath,
        },
      });

      if (!config || !config.enabled) {
        return null;
      }

      await rateLimitConfigCache.set(cacheKey, config, CACHE_TTL);
      return config;
    } catch {
      return null;
    }
  }

  list(routePath?: string) {
    try {
      const where: RateLimitConfigWhereInput | undefined = routePath
        ? {
            routePath: {
              contains: routePath,
              mode: Prisma.QueryMode.insensitive,
            },
            enabled: true,
          }
        : { enabled: true };
      return this.deps.db.rateLimitConfig.findMany({
        where,
        orderBy: [{ routePath: 'asc' }],
      });
    } catch {
      return [];
    }
  }

  async create(data: {
    routePath: string;
    limit: number;
    windowSeconds: number;
    strategy: RateLimitStrategy;
    description?: string;
  }) {
    const config = await this.deps.db.rateLimitConfig.create({
      data: {
        id: `rlcfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        routePath: data.routePath,
        limit: data.limit,
        windowSeconds: data.windowSeconds,
        strategy: data.strategy,
        description: data.description,
      },
    });

    await this.invalidateCache([data.routePath]);
    return config;
  }

  async update(
    id: string,
    data: {
      routePath?: string;
      limit?: number;
      windowSeconds?: number;
      strategy?: RateLimitStrategy;
      enabled?: boolean;
      description?: string;
    },
  ) {
    const existing = await this.deps.db.rateLimitConfig.findUnique({
      where: { id },
      select: { routePath: true },
    });

    const config = await this.deps.db.rateLimitConfig.update({
      where: { id },
      data,
    });

    const routePaths = [existing?.routePath, data.routePath].filter(
      Boolean,
    ) as string[];

    await this.invalidateCache(routePaths);
    return config;
  }

  async delete(id: string) {
    const existing = await this.deps.db.rateLimitConfig.delete({
      where: { id },
      select: { routePath: true },
    });

    await this.invalidateCache([existing.routePath]);
  }

  async invalidateCache(routePaths: string[] = []): Promise<void> {
    if (!routePaths.length) {
      return;
    }
    await Promise.all(
      routePaths.map((routePath) =>
        rateLimitConfigCache.del(this.buildCacheKey(routePath)),
      ),
    );
  }

  private buildCacheKey(routePath: string) {
    return `route:${routePath}`;
  }
}

export const rateLimitConfigService = new RateLimitConfigService();
