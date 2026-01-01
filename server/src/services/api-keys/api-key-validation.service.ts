import { db, type IDb } from 'src/config/db';
import { ApiKeyStatus, UserStatus } from 'src/generated';
import { type IdUtil, idUtil } from 'src/share';
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
      idUtil: IdUtil;
    } = {
      db,
      apiKeyService,
      idUtil,
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
    await this.deps.db.$transaction(async (tx) => {
      await tx.apiKeyUsage.create({
        data: {
          id: this.deps.idUtil.snowflakeId(),
          apiKeyId,
          endpoint: context.endpoint,
          method: context.method,
          ip: context.ip || 'unknown',
          userAgent: context.userAgent,
          statusCode: context.statusCode,
        },
      });

      // Update last used timestamp
      await tx.apiKey.update({
        where: { id: apiKeyId },
        data: { lastUsedAt: new Date() },
      });
    });
  }
}

export const apiKeyValidationService = new ApiKeyValidationService();
