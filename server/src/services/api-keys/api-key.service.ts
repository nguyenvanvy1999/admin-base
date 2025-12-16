import { createHash } from 'node:crypto';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type {
  ApiKeyListQueryParams,
  CreateApiKeyParams,
  RevokeApiKeyParams,
  UpdateApiKeyParams,
} from 'src/dtos/api-keys.dto';
import { type ApiKeySelect, ApiKeyStatus } from 'src/generated';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import {
  buildSearchOrCondition,
  executeListQuery,
  normalizeSearchTerm,
} from 'src/services/shared/utils';
import { BadReqErr, DB_PREFIX, ErrCode, IdUtil, NotFoundErr } from 'src/share';
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
    } = {
      db,
      auditLogService: auditLogsService,
      env: env,
    },
  ) {}

  private generateKey(): string {
    const randomBytes = crypto.getRandomValues(
      new Uint8Array(this.deps.env.API_KEY_LENGTH),
    );
    const randomString = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${this.deps.env.API_KEY_PREFIX}${randomString}`;
  }

  private hashKey(key: string): string {
    const peppered = `${key}${this.deps.env.API_KEY_PEPPER}`;
    return createHash('sha256').update(peppered).digest('hex');
  }

  private getKeyPrefix(key: string): string {
    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    return `${start}...${end}`;
  }

  async create(
    userId: string,
    params: CreateApiKeyParams,
    context: { currentUserId: string; hasCreatePermission: boolean },
  ) {
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

    const key = this.generateKey();
    const hashedKey = this.hashKey(key);
    const keyPrefix = this.getKeyPrefix(key);

    const apiKey = await this.deps.db.apiKey.create({
      data: {
        id: IdUtil.dbId(DB_PREFIX.API_KEY),
        userId,
        name: params.name,
        key: hashedKey,
        keyPrefix,
        status: ApiKeyStatus.active,
        permissions: params.permissions,
        ipWhitelist: params.ipWhitelist || [],
        expiresAt: params.expiresAt || null,
        metadata: params.metadata || null,
      },
      select: apiKeySelect,
    });

    await this.deps.auditLogService.pushOther({
      category: 'internal',
      eventType: 'api_event',
      level: 'info',
      endpoint: '/api/admin/api-keys',
      method: 'POST',
      statusCode: 201,
    });

    // Return with full key (only on creation)
    return {
      ...apiKey,
      key,
    };
  }

  async update(
    params: UpdateApiKeyParams,
    context: { currentUserId: string; hasUpdatePermission: boolean },
  ) {
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

    // Audit log
    await this.deps.auditLogService.pushOther({
      category: 'internal',
      eventType: 'api_event',
      level: 'info',
      endpoint: '/api/admin/api-keys/:id',
      method: 'PUT',
      statusCode: 200,
    });

    return updated;
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

    const where: any = {};

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
      where.OR = buildSearchOrCondition(['name'], normalizedSearch);
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

  async revoke(
    params: RevokeApiKeyParams,
    context: { currentUserId: string; hasDeletePermission: boolean },
  ) {
    const apiKey = await this.deps.db.apiKey.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!apiKey) {
      throw new NotFoundErr(ErrCode.NotFound);
    }

    if (
      apiKey.userId !== context.currentUserId &&
      !context.hasDeletePermission
    ) {
      throw new BadReqErr(ErrCode.Forbidden);
    }

    await this.deps.db.apiKey.update({
      where: { id: params.id },
      data: {
        status: ApiKeyStatus.revoked,
      },
    });

    // Audit log
    await this.deps.auditLogService.pushCud({
      category: 'cud',
      entityType: 'api_key',
      entityId: params.id,
      action: 'update',
      changes: {
        status: { previous: ApiKeyStatus.active, next: ApiKeyStatus.revoked },
      },
    });
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

    // Audit log
    await this.deps.auditLogService.pushOther({
      category: 'internal',
      eventType: 'api_event',
      level: 'info',
      endpoint: '/api/api-keys/del',
      method: 'POST',
      statusCode: 200,
    });
  }

  async verifyKey(key: string): Promise<{ valid: boolean; apiKeyId?: string }> {
    if (!key.startsWith(this.deps.env.API_KEY_PREFIX)) {
      return { valid: false };
    }

    const hashedKey = this.hashKey(key);

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

  getForValidation(id: string) {
    return this.deps.db.apiKey.findUnique({
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
  }

  async updateLastUsed(id: string) {
    await this.deps.db.apiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }
}

export const apiKeyService = new ApiKeyService();
