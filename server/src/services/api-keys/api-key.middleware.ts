import type { Elysia } from 'elysia';
import { ctxStore, ErrCode, UnAuthErr } from 'src/share';
import { apiKeyValidationService } from './api-key-validation.service';

export interface IApiKeyContext {
  apiKeyId: string;
  userId: string;
  permissions?: string[] | null;
}

export const apiKeyMiddleware = (app: Elysia) =>
  app.guard({ as: 'scoped' }).resolve({ as: 'local' }, async ({ headers }) => {
    // Try to get API key from headers
    const xApiKey = headers['x-api-key'];
    const authHeader = headers['authorization'];

    let apiKey: string | undefined;

    if (xApiKey) {
      apiKey = xApiKey;
    } else if (authHeader) {
      apiKey = authHeader;
    }

    // If no API key found, return empty context (optional middleware)
    if (!apiKey) {
      return { apiKeyContext: null };
    }

    // Validate API key
    const validation = await apiKeyValidationService.validateFromHeader(apiKey);

    if (!validation.valid || !validation.context) {
      return { apiKeyContext: null };
    }

    const context = validation.context;

    // Store in context
    const current = ctxStore.getStore();
    if (current) {
      current.userId = context.userId;
      current.apiKeyId = context.apiKeyId;
    }

    return {
      apiKeyContext: {
        apiKeyId: context.apiKeyId,
        userId: context.userId,
        permissions: context.permissions,
      } satisfies IApiKeyContext,
    };
  });

export const requiredApiKeyMiddleware = (app: Elysia) =>
  app.guard({ as: 'scoped' }).resolve({ as: 'local' }, async ({ headers }) => {
    const xApiKey = headers['x-api-key'];
    const authHeader = headers['authorization'];

    let apiKey: string | undefined;

    if (xApiKey) {
      apiKey = xApiKey;
    } else if (authHeader) {
      apiKey = authHeader;
    }

    if (!apiKey) {
      throw new UnAuthErr(ErrCode.InvalidApiKey);
    }

    const validation = await apiKeyValidationService.validateFromHeader(apiKey);

    if (!validation.valid || !validation.context) {
      throw new UnAuthErr(ErrCode.InvalidApiKey, {
        errors: validation.error,
      });
    }

    const context = validation.context;

    const current = ctxStore.getStore();
    if (current) {
      current.userId = context.userId;
      current.apiKeyId = context.apiKeyId;
    }

    return {
      apiKeyContext: {
        apiKeyId: context.apiKeyId,
        userId: context.userId,
        permissions: context.permissions,
      } satisfies IApiKeyContext,
    };
  });
