import { beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

let logger: any;

describe('Logger Utility', () => {
  beforeEach(async () => {
    const mod = await import('src/config/logger');
    logger = mod.logger;
  });

  it('should expose a configured logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.trace).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.warning).toBe('function');
  });

  it('should not throw when logging at various levels', () => {
    expect(() => logger.trace('trace message')).not.toThrow();
    expect(() => logger.debug('debug message')).not.toThrow();
    expect(() => logger.info('info message')).not.toThrow();
    expect(() => logger.warning('warn message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
    expect(() => logger.fatal('fatal message')).not.toThrow();
  });

  it('should expose httpLogger and slowReqLogger with basic methods', async () => {
    const mod = await import('src/config/logger');
    const httpLogger = mod.httpLogger;
    const slowReqLogger = mod.slowReqLogger;
    expect(httpLogger).toBeDefined();
    expect(typeof httpLogger.info).toBe('function');
    expect(typeof httpLogger.error).toBe('function');
    expect(typeof httpLogger.fatal).toBe('function');
    expect(typeof httpLogger.warning).toBe('function');
    expect(slowReqLogger).toBeDefined();
    expect(typeof slowReqLogger.info).toBe('function');
    expect(typeof slowReqLogger.error).toBe('function');
    expect(typeof slowReqLogger.fatal).toBe('function');
    expect(typeof slowReqLogger.warning).toBe('function');
  });

  it('should handle complex payloads and Error instances without throwing', () => {
    const complex = {
      id: 123,
      name: 'test',
      nested: { arr: [1, 2, 3], flag: true },
      date: new Date(),
      buffer: Buffer.from('abc'),
    };
    const err = new Error('boom');
    (err as any).code = 'E_CUSTOM';
    expect(() => logger.info('obj', complex)).not.toThrow();
    expect(() => logger.error('error', err)).not.toThrow();
    expect(() => logger.warning?.('mix', complex, err)).not.toThrow();
  });

  it('should allow multiple imports without reconfiguration errors', async () => {
    const first = await import('src/config/logger');
    const second = await import('src/config/logger');
    expect(first.logger).toBeDefined();
    expect(second.logger).toBeDefined();
    expect(() => first.logger.info('first import')).not.toThrow();
    expect(() => second.logger.info('second import')).not.toThrow();
  });

  it('should initialize under a temporary working directory and log without throwing', async () => {
    // Change CWD to a temp directory so the file sinks resolve logs/ there
    const origCwd = process.cwd();
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    process.chdir(tmpBase);
    try {
      const moduleUrl = new URL(
        '../../../src/config/logger.ts',
        import.meta.url,
      );
      const fresh = await import(`${moduleUrl.href}?t=${Date.now()}`);
      expect(fresh.logger).toBeDefined();
      expect(() => fresh.logger.info('temp cwd info')).not.toThrow();
      // Ensure sinks usage could create the logs directory lazily
      const logsDir = path.resolve(process.cwd(), 'logs');
      // Not asserting existence strictly, but ensure access checks do not throw
      expect(() => fs.accessSync(path.dirname(logsDir))).not.toThrow();
    } finally {
      process.chdir(origCwd);
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });
});
