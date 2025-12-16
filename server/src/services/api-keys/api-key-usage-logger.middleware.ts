import type { Elysia } from 'elysia';
import { ctxStore } from 'src/share';
import { apiKeyValidationService } from './api-key-validation.service';

export const apiKeyUsageLoggerMiddleware = (app: Elysia) =>
  app.onAfterResponse(async (ctx) => {
    const context = ctxStore.getStore();
    const apiKeyId = context?.apiKeyId;

    if (!apiKeyId) {
      return;
    }

    const method = ctx.request.method;
    const url = new URL(ctx.request.url);
    const endpoint = url.pathname + url.search;
    const clientIp = context?.clientIp || null;
    const userAgent = context?.userAgent || null;

    const statusCode = Number(ctx.set.status) || 200;

    await apiKeyValidationService.logUsage(apiKeyId, {
      endpoint,
      method,
      ip: clientIp,
      userAgent,
      statusCode,
    });
  });
