import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ElysiaAdapter } from '@bull-board/elysia';
import type { Elysia } from 'elysia';
import { env } from 'src/config/env';
import { logger } from 'src/config/logger';
import {
  auditLogQueue,
  batchLogQueue,
  emailQueue,
  p2pQueue,
  teleQueue,
} from 'src/config/queue';

export const bullBoardConfig = () => (app: Elysia) => {
  if (env.ENB_BULL_BOARD) {
    logger.info(`🔧 Setup Bull Board at ${env.BACKEND_URL}/queues`);
    const serverAdapter = new ElysiaAdapter(`/queues`);
    createBullBoard({
      queues: [
        new BullMQAdapter(teleQueue),
        new BullMQAdapter(emailQueue),
        new BullMQAdapter(p2pQueue),
        new BullMQAdapter(auditLogQueue),
        new BullMQAdapter(batchLogQueue),
      ],
      serverAdapter,
      options: {
        uiBasePath: './node_modules/@bull-board/ui',
        uiConfig: {
          boardTitle: 'Queue Dashboard',
        },
      },
    });
    return app.use(serverAdapter.registerPlugin());
  }
  return app;
};
