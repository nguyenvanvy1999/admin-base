import { settingCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type { RateLimitStrategy, RateLimitType } from 'src/generated';
import { RateLimitStrategy as RateStrategyEnum } from 'src/generated';
import type { RateLimitConfig } from './rate-limit.middleware';

const CACHE_TTL = 300;

export class RateLimitConfigService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async getConfigForType(
    type: RateLimitType,
    routePath?: string,
  ): Promise<RateLimitConfig | null> {
    const cacheKey = `rate_limit_config:${type}:${routePath || 'default'}`;
    const cached = (await settingCache.get(cacheKey)) as
      | RateLimitConfig
      | null
      | undefined;

    if (cached) {
      return cached;
    }

    let config: RateLimitConfig | null = null;

    if (routePath) {
      config = await this.getConfigByRoute(type, routePath);
    }

    if (!config) {
      config = await this.getConfigByType(type);
    }

    if (!config) {
      return null;
    }

    await settingCache.set(cacheKey, config, CACHE_TTL);
    return config;
  }

  private async getConfigByRoute(
    type: RateLimitType,
    routePath: string,
  ): Promise<RateLimitConfig | null> {
    try {
      const config = await this.deps.db.rateLimitConfig.findUnique({
        where: {
          rate_limit_config_unique: {
            type,
            routePath,
          },
        },
        select: {
          limit: true,
          windowSeconds: true,
          strategy: true,
          enabled: true,
        },
      });

      if (!config || !config.enabled) {
        return null;
      }

      return {
        type,
        limit: config.limit,
        windowSeconds: config.windowSeconds,
        strategy: this.validateStrategy(config.strategy),
      };
    } catch {
      return null;
    }
  }

  private async getConfigByType(
    type: RateLimitType,
  ): Promise<RateLimitConfig | null> {
    try {
      const config = await this.deps.db.rateLimitConfig.findFirst({
        where: {
          type,
        },
        select: {
          limit: true,
          windowSeconds: true,
          strategy: true,
          enabled: true,
        },
      });

      if (!config || !config.enabled) {
        return null;
      }

      return {
        type,
        limit: config.limit,
        windowSeconds: config.windowSeconds,
        strategy: this.validateStrategy(config.strategy),
      };
    } catch {
      return null;
    }
  }

  list(type?: RateLimitType) {
    try {
      const where = type ? { type, enabled: true } : { enabled: true };
      return this.deps.db.rateLimitConfig.findMany({
        where,
        orderBy: [{ type: 'asc' }, { routePath: 'asc' }],
      });
    } catch {
      return [];
    }
  }

  async create(data: {
    type: RateLimitType;
    routePath?: string;
    limit: number;
    windowSeconds: number;
    strategy: RateLimitStrategy;
    description?: string;
  }) {
    const config = await this.deps.db.rateLimitConfig.create({
      data: {
        id: `rlcfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: data.type,
        routePath: data.routePath ?? null,
        limit: data.limit,
        windowSeconds: data.windowSeconds,
        strategy: data.strategy,
        description: data.description,
      },
    });

    await this.invalidateCache();
    return config;
  }

  async update(
    id: string,
    data: {
      limit?: number;
      windowSeconds?: number;
      strategy?: RateLimitStrategy;
      enabled?: boolean;
      description?: string;
    },
  ) {
    const config = await this.deps.db.rateLimitConfig.update({
      where: { id },
      data,
    });

    await this.invalidateCache();
    return config;
  }

  async delete(id: string) {
    await this.deps.db.rateLimitConfig.delete({
      where: { id },
    });

    await this.invalidateCache();
  }

  async invalidateCache(): Promise<void> {
    const cacheKeys = [
      'rate_limit_config:login:default',
      'rate_limit_config:password_reset:default',
      'rate_limit_config:email_verification:default',
      'rate_limit_config:api:default',
      'rate_limit_config:file_upload:default',
    ];

    await Promise.all(cacheKeys.map((key) => settingCache.del(key)));
  }

  private validateStrategy(strategy: string | null): RateLimitStrategy {
    if (
      strategy &&
      Object.values(RateStrategyEnum).includes(strategy as RateLimitStrategy)
    ) {
      return strategy as RateLimitStrategy;
    }
    return RateStrategyEnum.ip;
  }
}

export const rateLimitConfigService = new RateLimitConfigService();
