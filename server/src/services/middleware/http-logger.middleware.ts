import type { Elysia } from 'elysia';
import { slowReqLogger } from 'src/config/logger';
import { getIP } from 'src/config/request';

export const httpLoggerMiddleware =
  () =>
  (
    app: Elysia<
      '',
      {
        store: { startTime: number; endTime: number; responseTime: number };
        derive: Record<string, unknown>;
        decorator: Record<string, unknown>;
        resolve: Record<string, unknown>;
      }
    >,
  ) =>
    app
      .onRequest((ctx) => {
        ctx.store = { ...ctx.store, startTime: performance.now() };
      })
      .onAfterResponse((ctx) => {
        const path = new URL(ctx.request.url).pathname;

        if (
          path.includes('swagger') ||
          path.includes('queues') ||
          path.includes('/ws')
        ) {
          return;
        }

        const responseTime = performance.now() - (ctx.store.startTime ?? 0);

        if (responseTime > 1000) {
          const statusCode = Number(ctx.set.status) || 200;

          type MaybeReqMeta = { userAgent?: string; clientIp?: string };
          const meta = ctx as unknown as MaybeReqMeta;
          const userAgent =
            meta.userAgent ??
            ctx.request.headers.get('user-agent') ??
            'Unknown';
          const clientIp =
            meta.clientIp ??
            getIP(ctx.request.headers) ??
            ctx.server?.requestIP(ctx.request)?.address ??
            'Unknown';

          const logMessage = `${ctx.request.method} ${process.pid} ${path} ${statusCode} ${responseTime.toFixed(2)}ms ${clientIp} ${userAgent}`;

          slowReqLogger.warning(logMessage);
        }
      });
