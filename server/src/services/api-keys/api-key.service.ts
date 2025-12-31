import { apiKeyCache, type IApiKeyCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type {
  ApiKeyListQueryParams,
  UpsertApiKeyParams,
} from 'src/dtos/api-keys.dto';
import {
  type ApiKeySelect,
  ApiKeyStatus,
  type ApiKeyWhereInput,
} from 'src/generated';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { buildUpdateChanges } from 'src/services/audit-logs/utils';
import {
  BadReqErr,
  buildSearchOrCondition,
  DB_PREFIX,
  ErrCode,
  executeListQuery,
  type IdUtil,
  idUtil,
  NotFoundErr,
  normalizeSearchTerm,
} from 'src/share';
import type { AuditLogsService } from '../audit-logs';

const apiKeySelect = {
  id: true,
  userId: true,
  name: true,
  key: true,
  keyPrefix: true,
  status: true,
  permissions: true,
  ipWhitelist: true,
  lastUsedAt: true,
  expiresAt: true,
  metadata: true,
  created: true,
  modified: true,
} satisfies ApiKeySelect;

export class ApiKeyService {
  constructor(
    private readonly deps: {
      db: IDb;
      auditLogService: AuditLogsService;
      env: IEnv;
      cache: IApiKeyCache;
      idUtil: IdUtil;
    } = {
      db,
      auditLogService: auditLogsService,
      env: env,
      cache: apiKeyCache,
      idUtil,
    },
  ) {}

  private hashKey(key: string): Promise<string> {
    const peppered = `${key}${this.deps.env.API_KEY_PEPPER}`;
    return Bun.password.hash(peppered);
  }

  private getKeyPrefix(key: string): string {
    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    return `${start}...${end}`;
  }

  async upsert(
    params: UpsertApiKeyParams,
    context: {
      currentUserId: string;
      hasCreatePermission: boolean;
      hasUpdatePermission: boolean;
    },
  ) {
    // If id is provided, it's an update
    if (params.id) {
      const apiKey = await this.deps.db.apiKey.findUnique({
        where: { id: params.id },
        select: apiKeySelect,
      });
      if (!apiKey) {
        throw new NotFoundErr(ErrCode.NotFound);
      }

      // Validate ownership or admin permission
      if (
        apiKey.userId !== context.currentUserId &&
        !context.hasUpdatePermission
      ) {
        throw new BadReqErr(ErrCode.PermissionDenied);
      }

      const updated = await this.deps.db.apiKey.update({
        where: { id: params.id },
        data: {
          name: params.name,
          expiresAt: params.expiresAt,
          permissions: params.permissions,
          ipWhitelist: params.ipWhitelist,
          metadata: params.metadata,
        },
        select: apiKeySelect,
      });

      await this.deps.cache.del(params.id);

      // Audit log
      const changes = buildUpdateChanges(apiKey, updated, {
        includeFields: [
          'name',
          'expiresAt',
          'permissions',
          'ipWhitelist',
          'metadata',
        ],
      });

      await this.deps.auditLogService.pushCud({
        category: 'cud',
        entityType: 'api_key',
        entityId: params.id,
        action: 'update',
        changes,
        entityDisplay: {
          name: updated.name,
          userId: updated.userId,
        },
      });

      return updated;
    }

    // Otherwise, it's a create
    const userId = params.userId || context.currentUserId;
    if (userId !== context.currentUserId && !context.hasCreatePermission) {
      throw new BadReqErr(ErrCode.PermissionDenied);
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    const key = `${this.deps.env.API_KEY_PREFIX}${this.deps.idUtil.token32()}`;
    const hashedKey = await this.hashKey(key);
    const keyPrefix = this.getKeyPrefix(key);

    const apiKey = await this.deps.db.apiKey.create({
      data: {
        id: this.deps.idUtil.dbId(DB_PREFIX.API_KEY),
        userId,
        name: params.name,
        key: hashedKey,
        keyPrefix,
        status: ApiKeyStatus.active,
        permissions: params.permissions,
        ipWhitelist: params.ipWhitelist,
        expiresAt: params.expiresAt,
        metadata: params.metadata,
      },
      select: apiKeySelect,
    });

    await this.deps.auditLogService.pushCud({
      category: 'cud',
      entityType: 'api_key',
      entityId: apiKey.id,
      action: 'create',
      entityDisplay: {
        name: apiKey.name,
        userId: apiKey.userId,
      },
    });

    // Return with full key (only on creation)
    return {
      ...apiKey,
      key,
    };
  }

  list(params: ApiKeyListQueryParams) {
    const {
      userId,
      userIds,
      status,
      search,
      take,
      skip,
      currentUserId,
      hasViewPermission,
    } = params;

    const normalizedSearch = normalizeSearchTerm(search);

    const where: ApiKeyWhereInput = {};

    // Permission-based filtering
    if (!hasViewPermission) {
      // User can only see their own keys
      where.userId = currentUserId;
    } else {
      // Admin can filter by userId or userIds
      if (userId) {
        where.userId = userId;
      } else if (userIds) {
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        if (ids.length > 0) {
          where.userId = { in: ids };
        }
      }
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Search filter
    if (normalizedSearch) {
      Object.assign(
        where,
        buildSearchOrCondition<ApiKeyWhereInput>(['name'], normalizedSearch),
      );
    }

    return executeListQuery(this.deps.db.apiKey, {
      where,
      select: apiKeySelect,
      take,
      skip,
    });
  }

  async detail(
    id: string,
    context: { currentUserId: string; hasViewPermission: boolean },
  ) {
    const apiKey = await this.deps.db.apiKey.findUnique({
      where: { id },
      select: {
        ...apiKeySelect,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    if (!apiKey) {
      throw new NotFoundErr(ErrCode.NotFound);
    }

    // Validate ownership or admin permission
    if (apiKey.userId !== context.currentUserId && !context.hasViewPermission) {
      throw new BadReqErr(ErrCode.Forbidden);
    }

    // Get usage stats
    const usage = await this.deps.db.apiKeyUsage.aggregate({
      where: { apiKeyId: id },
      _count: true,
      _max: {
        timestamp: true,
      },
    });

    return {
      ...apiKey,
      usage: {
        totalRequests: usage._count,
        lastUsedAt: usage._max.timestamp,
      },
    };
  }

  async revokeMany(
    ids: string[],
    context: { currentUserId: string; hasDeletePermission: boolean },
  ) {
    if (ids.length === 0) return;

    // Fetch all keys to validate ownership
    const apiKeys = await this.deps.db.apiKey.findMany({
      where: { id: { in: ids } },
      select: { id: true, userId: true },
    });

    // Validate ownership or admin permission
    for (const key of apiKeys) {
      if (
        key.userId !== context.currentUserId &&
        !context.hasDeletePermission
      ) {
        throw new Error(ErrCode.Forbidden);
      }
    }

    await this.deps.db.apiKey.updateMany({
      where: { id: { in: ids } },
      data: {
        status: ApiKeyStatus.revoked,
      },
    });

    await this.deps.cache.delMany(ids);

    // Audit log - push for each revoked key
    for (const key of apiKeys) {
      await this.deps.auditLogService.pushCud({
        category: 'cud',
        entityType: 'api_key',
        entityId: key.id,
        action: 'delete',
        entityDisplay: {
          userId: key.userId,
        },
      });
    }
  }

  async verifyKey(key: string): Promise<{ valid: boolean; apiKeyId?: string }> {
    if (!key.startsWith(this.deps.env.API_KEY_PREFIX)) {
      return { valid: false };
    }

    const hashedKey = await this.hashKey(key);

    const apiKey = await this.deps.db.apiKey.findUnique({
      where: { key: hashedKey },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      return { valid: false };
    }

    // Check status
    if (apiKey.status !== ApiKeyStatus.active) {
      return { valid: false };
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false };
    }

    return { valid: true, apiKeyId: apiKey.id };
  }

  async getForValidation(id: string) {
    const cached = await this.deps.cache.get(id);
    if (cached) {
      return cached;
    }

    const apiKey = await this.deps.db.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        key: true,
        status: true,
        permissions: true,
        ipWhitelist: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (apiKey) {
      await apiKeyCache.set(id, apiKey);
    }

    return apiKey;
  }
}

export const apiKeyService = new ApiKeyService();
