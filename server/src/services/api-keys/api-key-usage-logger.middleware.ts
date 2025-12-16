import type { Elysia } from 'elysia';
import { apiKeyUsageQueue } from 'src/config/queue';
import { ctxStore } from 'src/share';

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

    // Add job to queue instead of logging directly
    // This prevents blocking the response
    await apiKeyUsageQueue.add(
      'log-usage',
      {
        apiKeyId,
        endpoint,
        method,
        ip: clientIp,
        userAgent,
        statusCode,
      },
      {
        // Use a job ID based on timestamp to avoid duplicates in quick succession
        jobId: `${apiKeyId}-${Date.now()}`,
      },
    );
  });
