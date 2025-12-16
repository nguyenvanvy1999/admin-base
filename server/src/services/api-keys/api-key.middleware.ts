import type { Elysia } from 'elysia';
import { ctxStore, getIpAndUa } from 'src/share';
import { apiKeyValidationService } from './api-key-validation.service';

export interface IApiKeyContext {
  apiKeyId: string;
  userId: string;
  permissions?: string[] | null;
}

export const apiKeyMiddleware = (app: Elysia) =>
  app
    .guard({ as: 'scoped' })
    .resolve({ as: 'local' }, async ({ headers, request }) => {
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

      const { clientIp, userAgent } = getIpAndUa(false);

      // Validate API key
      const validation =
        await apiKeyValidationService.validateFromHeader(apiKey);

      if (!validation.valid || !validation.context) {
        return { apiKeyContext: null };
      }

      const context = validation.context;

      // Log usage
      try {
        const url = new URL(request.url);
        const method = request.method;
        const endpoint = url.pathname;

        await apiKeyValidationService.logUsage(context.apiKeyId, {
          endpoint,
          method,
          ip: clientIp,
          userAgent: userAgent,
          statusCode: 200,
        });

        // Audit log
        await apiKeyValidationService.auditLogAccess({
          endpoint,
          method,
          ip: clientIp,
          statusCode: 200,
        });
      } catch (error) {
        // Don't fail request if logging fails
        console.error('Failed to log API key usage:', error);
      }

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
  app
    .guard({ as: 'scoped' })
    .resolve({ as: 'local' }, async ({ headers, request }) => {
      const xApiKey = headers['x-api-key'];
      const authHeader = headers['authorization'];

      let apiKey: string | undefined;

      if (xApiKey) {
        apiKey = xApiKey;
      } else if (authHeader) {
        apiKey = authHeader;
      }

      if (!apiKey) {
        throw new Error('Missing API key');
      }

      const { clientIp, userAgent } = getIpAndUa(false);

      const validation =
        await apiKeyValidationService.validateFromHeader(apiKey);

      if (!validation.valid || !validation.context) {
        throw new Error(validation.error || 'Invalid API key');
      }

      const context = validation.context;

      // Log usage
      try {
        const url = new URL(request.url);
        const method = request.method;
        const endpoint = url.pathname;

        await apiKeyValidationService.logUsage(context.apiKeyId, {
          endpoint,
          method,
          ip: clientIp,
          userAgent,
          statusCode: 200,
        });

        await apiKeyValidationService.auditLogAccess({
          endpoint,
          method,
          ip: clientIp,
          statusCode: 200,
        });
      } catch (error) {
        console.error('Failed to log API key usage:', error);
      }

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
