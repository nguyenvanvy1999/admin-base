import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  getRotatingFileSink,
  type RotatingFileSinkOptions,
} from '@logtape/file';
import {
  configure,
  getConsoleSink,
  getJsonLinesFormatter,
  getLogger,
  withFilter,
} from '@logtape/logtape';
import { getPrettyFormatter } from '@logtape/pretty';
import { LOG_LEVEL } from '@server/share/constants/log';
import { appEnv } from './env';

const logsDir = path.resolve(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFileConfig = {
  maxSize: 10 * 1024 * 1024,
  maxFiles: 7,
  formatter: getJsonLinesFormatter(),
} satisfies RotatingFileSinkOptions;

await configure({
  sinks: {
    console: getConsoleSink({ formatter: getPrettyFormatter() }),
    warnErrorFile: withFilter(
      getRotatingFileSink(path.join(logsDir, 'warn-error.log'), logFileConfig),
      'warning',
    ),
    infoFile: withFilter(
      getRotatingFileSink(path.join(logsDir, 'info.log'), logFileConfig),
      (r) => ['info', 'debug'].includes(r.level),
    ),
    httpSlowFile: getRotatingFileSink(
      path.join(logsDir, 'slow-http.log'),
      logFileConfig,
    ),
    metaFile: getRotatingFileSink(
      path.join(logsDir, 'meta.log'),
      logFileConfig,
    ),
  },
  loggers: [
    {
      category: 'application',
      lowestLevel: appEnv.LOG_LEVEL,
      sinks: ['console', 'warnErrorFile', 'infoFile'],
    },
    {
      category: ['logtape', 'meta'],
      sinks: ['console', 'metaFile'],
      lowestLevel: LOG_LEVEL.WARNING,
    },
    {
      category: 'http',
      sinks: ['console'],
    },
    {
      category: 'httpSlow',
      sinks: ['console', 'httpSlowFile'],
      lowestLevel: LOG_LEVEL.WARNING,
    },
  ],
});

export const logger = getLogger('application');
export const httpLogger = getLogger('http');
export const slowReqLogger = getLogger('httpSlow');

export type ILogger = typeof logger;
