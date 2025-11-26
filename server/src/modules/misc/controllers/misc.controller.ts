import dayjs from 'dayjs';
import { Elysia, t } from 'elysia';
import { env } from 'src/config/env';
import { miscService } from 'src/service/misc/misc.service';
import {
  castToRes,
  DOC_TAG,
  ErrorResDto,
  HEALTH_STATE,
  ResWrapper,
} from 'src/share';
import { captchaController } from './captcha.controller';

export const miscController = new Elysia({
  detail: { tags: [DOC_TAG.MISC] },
  prefix: 'misc',
})
  .get(
    'health',
    async () => {
      try {
        const [memory, redis, db, disk] = await Promise.all([
          miscService.checkMemHealth(),
          miscService.checkRedisHealth(),
          miscService.checkDbHealth(),
          miscService.checkDiskHealth(),
        ]);
        return castToRes({
          status: HEALTH_STATE.OK,
          details: { memory, redis, db, disk },
        });
      } catch (error) {
        return castToRes({
          status: HEALTH_STATE.ERROR,
          details: null,
          error,
        });
      }
    },
    {
      detail: {
        summary: 'Get health check',
        description: 'Health check',
      },
      response: {
        200: ResWrapper(
          t.Object({
            status: t.Enum(HEALTH_STATE),
            details: t.Optional(t.Nullable(t.Any())),
            error: t.Optional(t.Nullable(t.Any())),
          }),
        ),
        500: ErrorResDto,
      },
    },
  )
  .get(
    'system-info',
    async () => {
      try {
        const result = await miscService.getSystemInfo();
        return castToRes(result);
      } catch (error) {
        return castToRes({
          status: HEALTH_STATE.ERROR,
          error: (error as Error).message,
        });
      }
    },
    {
      detail: {
        summary: 'Get system information',
        description:
          'Get detailed system information including disk usage, memory, CPU, and uptime',
      },
      response: {
        200: ResWrapper(
          t.Object({
            status: t.Enum(HEALTH_STATE),
            data: t.Optional(
              t.Object({
                diskUsage: t.String(),
                uptime: t.String(),
                loadAverage: t.String(),
                memory: t.Object({
                  total: t.String(),
                  free: t.String(),
                  used: t.String(),
                  usagePercent: t.String(),
                }),
                cpu: t.Object({
                  cores: t.Number(),
                  model: t.String(),
                  architecture: t.String(),
                  platform: t.String(),
                }),
                runtime: t.Object({
                  name: t.String(),
                  version: t.String(),
                  uptime: t.String(),
                }),
              }),
            ),
            error: t.Optional(t.String()),
          }),
        ),
        500: ErrorResDto,
      },
    },
  )
  .get(
    'time',
    () =>
      castToRes({
        t: Date.now(),
        time: dayjs().format('ddd, D MMM, H:m:s z'),
      }),
    {
      response: {
        200: ResWrapper(
          t.Object({
            t: t.Integer(),
            time: t.String(),
          }),
        ),
        500: ErrorResDto,
      },
      detail: {
        summary: 'Get server time',
        description: 'Get server time',
      },
    },
  )
  .get(
    'version',
    () =>
      castToRes({
        commitHash: env.COMMIT_HASH,
        buildDate: env.BUILD_DATE,
        buildNumber: env.BUILD_NUMBER,
      }),
    {
      response: {
        200: ResWrapper(
          t.Object({
            commitHash: t.String(),
            buildDate: t.Integer(),
            buildNumber: t.String(),
          }),
        ),
        500: ErrorResDto,
      },
      detail: {
        summary: 'Get server version',
        description: 'Get server version',
      },
    },
  )
  .use(captchaController);
