import { mock } from 'bun:test';
import type { ILogger } from 'src/config/logger';

export type MockLogger = ILogger & {
  trace: ReturnType<typeof mock>;
  debug: ReturnType<typeof mock>;
  info: ReturnType<typeof mock>;
  warning: ReturnType<typeof mock>;
  error: ReturnType<typeof mock>;
  fatal: ReturnType<typeof mock>;
};

export function createMockLogger(): MockLogger {
  return {
    trace: mock(() => undefined),
    debug: mock(() => undefined),
    info: mock(() => undefined),
    warning: mock(() => undefined),
    error: mock(() => undefined),
    fatal: mock(() => undefined),
  } as unknown as MockLogger;
}
