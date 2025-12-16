import { db, type IDb } from 'src/config/db';
import { ApiKeyStatus, UserStatus } from 'src/generated';
import { IdUtil } from 'src/share';
import { type AuditLogsService, auditLogsService } from '../audit-logs';
import type { ApiKeyService } from './api-key.service';
import { apiKeyService } from './api-key.service';

export interface IApiKeyValidationContext {
  apiKeyId: string;
  userId: string;
  permissions: string[];
  ipWhitelist: string[];
  expiresAt?: Date | null;
  userStatus: UserStatus;
}

export interface IApiKeyValidationResult {
  valid: boolean;
  context?: IApiKeyValidationContext;
  error?: string;
}

export class ApiKeyValidationService {
  constructor(
    private readonly deps: {
      db: IDb;
      apiKeyService: ApiKeyService;
      auditLogService: AuditLogsService;
    } = {
      db,
      apiKeyService,
      auditLogService: auditLogsService,
    },
  ) {}

  validateFromHeader(
    authHeader: string | undefined,
  ): Promise<IApiKeyValidationResult> {
    if (!authHeader) {
      return Promise.resolve({ valid: false, error: 'Missing API key' });
    }

    // Support both "Bearer sk_..." and direct "sk_..." formats
    let key = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      key = authHeader.slice(7);
    }

    return this.validate(key);
  }

  async validate(key: string): Promise<IApiKeyValidationResult> {
    // Verify key format and get ID
    const verification = await this.deps.apiKeyService.verifyKey(key);
    if (!verification.valid || !verification.apiKeyId) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Get full key details
    const apiKey = await this.deps.apiKeyService.getForValidation(
      verification.apiKeyId,
    );
    if (!apiKey) {
      return { valid: false, error: 'API key not found' };
    }

    // Check key status
    if (apiKey.status !== ApiKeyStatus.active) {
      return {
        valid: false,
        error: `API key is ${apiKey.status}`,
      };
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Check user status
    if (apiKey.user.status !== UserStatus.active) {
      return {
        valid: false,
        error: `User account is ${apiKey.user.status}`,
      };
    }

    // Build validation context
    const context: IApiKeyValidationContext = {
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      permissions: apiKey.permissions as string[],
      ipWhitelist: apiKey.ipWhitelist,
      expiresAt: apiKey.expiresAt,
      userStatus: apiKey.user.status,
    };

    return { valid: true, context };
  }

  validateIp(ip: string | null, whitelist: string[] | null): boolean {
    if (!ip) {
      return false;
    }

    // If no whitelist, allow all IPs
    if (!whitelist || whitelist.length === 0) {
      return true;
    }

    // Check if IP is in whitelist (simple check, can be enhanced with CIDR support)
    return whitelist.includes(ip);
  }

  validatePermission(
    requiredPermission: string,
    grantedPermissions: string[] | null,
  ): boolean {
    // If no permissions specified, allow all
    if (!grantedPermissions || grantedPermissions.length === 0) {
      return true;
    }

    // Check exact match or wildcard
    return (
      grantedPermissions.includes(requiredPermission) ||
      grantedPermissions.includes('*')
    );
  }

  async validateRequest(
    key: string,
    clientIp: string | null,
    requiredPermission?: string,
  ): Promise<IApiKeyValidationResult> {
    // Validate key
    const validation = await this.validate(key);
    if (!validation.valid) {
      return validation;
    }

    const context = validation.context!;

    // Validate IP
    if (!this.validateIp(clientIp, context.ipWhitelist)) {
      return {
        valid: false,
        error: 'IP address not whitelisted',
      };
    }

    // Validate permission if required
    if (requiredPermission) {
      if (!this.validatePermission(requiredPermission, context.permissions)) {
        return {
          valid: false,
          error: `Permission '${requiredPermission}' not granted`,
        };
      }
    }

    return { valid: true, context };
  }

  async logUsage(
    apiKeyId: string,
    context: {
      endpoint: string;
      method: string;
      ip: string | null;
      userAgent: string | null;
      statusCode: number;
    },
  ) {
    try {
      await this.deps.db.apiKeyUsage.create({
        data: {
          id: IdUtil.snowflakeId(),
          apiKeyId,
          endpoint: context.endpoint,
          method: context.method,
          ip: context.ip || 'unknown',
          userAgent: context.userAgent,
          statusCode: context.statusCode,
        },
      });

      // Update last used timestamp
      await this.deps.apiKeyService.updateLastUsed(apiKeyId);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to log API key usage:', error);
    }
  }

  async auditLogAccess(context: {
    endpoint: string;
    method: string;
    ip: string | null;
    statusCode: number;
  }) {
    try {
      await this.deps.auditLogService.pushOther({
        category: 'internal',
        eventType: 'api_event',
        level: 'info',
        endpoint: context.endpoint,
        method: context.method,
        statusCode: context.statusCode,
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to audit log API key access:', error);
    }
  }
}

export const apiKeyValidationService = new ApiKeyValidationService();
