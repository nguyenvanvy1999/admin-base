import { rateLimitConfigCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type { IUpsertRateLimitConfig } from 'src/dtos/rate-limit-config.dto';
import { Prisma, type RateLimitConfigWhereInput } from 'src/generated';
import type { RateLimitConfig } from './auth-rate-limit.config';

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

  async list(params: {
    routePath?: string;
    enabled?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { routePath, enabled, skip, take } = params;

    try {
      const where: RateLimitConfigWhereInput | undefined =
        routePath || enabled !== undefined
          ? {
              ...(routePath
                ? {
                    routePath: {
                      contains: routePath,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  }
                : {}),
              ...(enabled !== undefined ? { enabled } : {}),
            }
          : undefined;

      const [docs, count] = await this.deps.db.$transaction([
        this.deps.db.rateLimitConfig.findMany({
          where,
          skip,
          take,
          orderBy: [{ routePath: 'asc' }],
        }),
        this.deps.db.rateLimitConfig.count({ where }),
      ]);

      return { docs, count };
    } catch {
      return { docs: [], count: 0 };
    }
  }

  async upsert(data: IUpsertRateLimitConfig) {
    if (data.id) {
      // Update existing
      const existing = await this.deps.db.rateLimitConfig.findUnique({
        where: { id: data.id },
        select: { routePath: true },
      });

      if (!existing) {
        throw new Error('Rate limit config not found');
      }

      const config = await this.deps.db.rateLimitConfig.update({
        where: { id: data.id },
        data: {
          routePath: data.routePath,
          limit: data.limit,
          windowSeconds: data.windowSeconds,
          strategy: data.strategy,
          enabled: data.enabled,
          description: data.description,
        },
      });

      const routePaths = [existing.routePath, data.routePath].filter(
        Boolean,
      ) as string[];
      await this.invalidateCache(routePaths);
      return config;
    } else {
      // Create new
      const config = await this.deps.db.rateLimitConfig.create({
        data: {
          id: `rlcfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          routePath: data.routePath,
          limit: data.limit,
          windowSeconds: data.windowSeconds,
          strategy: data.strategy,
          enabled: data.enabled ?? true,
          description: data.description,
        },
      });

      await this.invalidateCache([data.routePath]);
      return config;
    }
  }

  async deleteMany(ids: string[]) {
    if (ids.length === 0) return;

    const configs = await this.deps.db.rateLimitConfig.findMany({
      where: { id: { in: ids } },
      select: { id: true, routePath: true },
    });

    await this.deps.db.rateLimitConfig.deleteMany({
      where: { id: { in: ids } },
    });

    const routePaths = configs.map((c) => c.routePath);
    await this.invalidateCache(routePaths);
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
