import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { SystemService } from 'src/services/infrastructure/system.service';
import { HEALTH_STATE } from 'src/share';
import { TestLifecycle } from 'test/utils';
import { createPrismaMock } from 'test/utils/mocks/prisma';
import { createRedisMock } from 'test/utils/mocks/redis';

type FakeSpawnProcess = {
  stdout: ReadableStream | null;
  stderr: ReadableStream | null;
  exited: Promise<number>;
  kill: () => void;
  killed: boolean;
};

function createReadableStreamFromString(text: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

function makeSpawnSuccessDfH(usagePercent: string): FakeSpawnProcess {
  const dfOutput = `Filesystem Size Used Avail Use% Mounted on\nrootfs 100G 50G 50G ${usagePercent} /`;
  let killed = false;
  return {
    stdout: createReadableStreamFromString(dfOutput),
    stderr: null,
    exited: Promise.resolve(0),
    kill: () => {
      killed = true;
    },
    get killed() {
      return killed;
    },
  } as unknown as FakeSpawnProcess;
}

function makeSpawnSuccessDfK(
  totalKb: number,
  availKb: number,
): FakeSpawnProcess {
  // lines[1] => fields: [filesystem, blocks, used, available, use%, mount]
  const usedKb = totalKb - availKb;
  const usedPercent = Math.floor((usedKb / totalKb) * 100);
  const dfOutput = `Filesystem 1K-blocks Used Available Use% Mounted on\nrootfs ${totalKb} ${usedKb} ${availKb} ${usedPercent}% /`;
  let killed = false;
  return {
    stdout: createReadableStreamFromString(dfOutput),
    stderr: null,
    exited: Promise.resolve(0),
    kill: () => {
      killed = true;
    },
    get killed() {
      return killed;
    },
  } as unknown as FakeSpawnProcess;
}

function makeSpawnNonZero(): FakeSpawnProcess {
  let killed = false;
  return {
    stdout: createReadableStreamFromString(''),
    stderr: createReadableStreamFromString('err'),
    exited: Promise.resolve(1),
    kill: () => {
      killed = true;
    },
    get killed() {
      return killed;
    },
  } as unknown as FakeSpawnProcess;
}

function makeSpawnNeverResolves(): FakeSpawnProcess {
  let killed = false;
  return {
    stdout: createReadableStreamFromString(''),
    stderr: createReadableStreamFromString(''),
    exited: new Promise<number>(() => void 0),
    kill: () => {
      killed = true;
    },
    get killed() {
      return killed;
    },
  } as unknown as FakeSpawnProcess;
}

describe('SystemService', () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    TestLifecycle.clearMock();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  });

  function buildService(overrides?: Record<string, unknown>): {
    svc: SystemService;
    deps: Required<ConstructorParameters<typeof SystemService>[0]>;
  } {
    const cache = createRedisMock();
    const prisma = createPrismaMock();
    prisma.$queryRaw = mock(async () => 1);
    const osModule = {
      totalmem: () => 16 * 1024 * 1024 * 1024,
      freemem: () => 8 * 1024 * 1024 * 1024,
      uptime: () => 3600 + 120,
      loadavg: () => [0.42, 0.2, 0.1],
      cpus: () => [
        { model: 'x64-cpu' },
        { model: 'x64-cpu' },
        { model: 'x64-cpu' },
        { model: 'x64-cpu' },
      ],
      arch: () => 'x64',
      platform: () => 'linux',
    };
    // Bun spawn + timers stubbed per test
    const bun = {
      spawn: (_args: Array<string>) => makeSpawnSuccessDfH('37%'),
      nanoseconds: () => 120 * 1_000_000_000,
    };
    const log = {
      error: mock(() => undefined),
      info: mock(() => undefined),
      warn: mock(() => undefined),
      debug: mock(() => undefined),
    };
    const deps = {
      cache: cache,
      db: prisma,
      osModule: osModule,
      bun: bun,
      log: log,
      ...overrides,
    } as unknown as Required<ConstructorParameters<typeof SystemService>[0]>;
    const svc = new SystemService(deps);
    return { svc, deps };
  }

  describe('getSystemInfo', () => {
    it('returns OK with formatted fields when healthy', async () => {
      const { svc } = buildService({
        bun: {
          spawn: (_args: Array<string>) => makeSpawnSuccessDfH('37%'),
          nanoseconds: () => 3 * 60 * 1_000_000_000,
        },
      });
      const result = await svc.getSystemInfo();
      expect(result.status).toBe(HEALTH_STATE.OK);
      expect(result.data?.diskUsage).toBe('37%');
      expect(result.data?.uptime).toContain('hours');
      expect(result.data?.loadAverage).toBe('0.42');
      expect(result.data?.memory.total.endsWith('GB')).toBe(true);
      expect(result.data?.cpu.cores).toBe(4);
      // kill called on child
      // We cannot access process instance directly here, but we can re-run getDiskUsage with a controllable proc
      const proc = makeSpawnSuccessDfH('15%');
      const bun = {
        spawn: mock(() => proc),
        nanoseconds: () => 1,
      };
      const { svc: svc2 } = buildService({ bun });
      await svc2.getSystemInfo();
      expect(proc.killed).toBe(true);
    });

    it('handles df non-zero exit by reporting 0% usage', async () => {
      const { svc } = buildService({
        bun: {
          spawn: () => makeSpawnNonZero(),
          nanoseconds: () => 1,
        },
      });
      const result = await svc.getSystemInfo();
      expect(result.status).toBe(HEALTH_STATE.OK);
      expect(result.data?.diskUsage).toBe('0%');
    });

    it('handles timeout quickly by stubbing setTimeout to immediate', async () => {
      // Force timeout path to fire immediately
      (globalThis.setTimeout as any) = (fn: (...args: any[]) => void) => {
        fn();
        return 1;
      };
      globalThis.clearTimeout = () => undefined;
      const hangingProc = makeSpawnNeverResolves();
      const { svc } = buildService({
        bun: {
          spawn: () => hangingProc,
          nanoseconds: () => 1,
        },
      });
      const result = await svc.getSystemInfo();
      expect(result.status).toBe(HEALTH_STATE.OK);
      expect(result.data?.diskUsage).toBe('0%');
      expect(hangingProc.killed).toBe(true);
    });

    it('handles os errors gracefully', async () => {
      const { svc } = buildService({
        osModule: {
          totalmem: () => 8 * 1024 * 1024 * 1024,
          freemem: () => 4 * 1024 * 1024 * 1024,
          uptime: () => {
            throw new Error('uptime fail');
          },
          loadavg: () => {
            throw new Error('loadavg fail');
          },
          cpus: () => [{}, {}],
          arch: () => 'x64',
          platform: () => 'linux',
        },
      });
      const result = await svc.getSystemInfo();
      expect(result.status).toBe(HEALTH_STATE.OK);
      expect(result.data?.uptime).toBe('Unknown');
      expect(result.data?.loadAverage).toBe('0.00');
    });
  });

  describe('checkMemHealth', () => {
    it('returns OK below threshold', () => {
      const { svc } = buildService({
        osModule: {
          totalmem: () => 100,
          freemem: () => 10, // used 90% < 95%
          uptime: () => 0,
          loadavg: () => [0],
          cpus: () => [{}, {}],
          arch: () => 'x64',
          platform: () => 'linux',
        },
      });
      const res = svc.checkMemHealth(0.95);
      expect(res.status).toBe(HEALTH_STATE.OK);
    });

    it('returns ERROR at threshold edge', () => {
      const { svc } = buildService({
        osModule: {
          totalmem: () => 100,
          freemem: () => 5, // used 95%
          uptime: () => 0,
          loadavg: () => [0],
          cpus: () => [{}, {}],
          arch: () => 'x64',
          platform: () => 'linux',
        },
      });
      const res = svc.checkMemHealth(0.95);
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });

    it('returns ERROR above threshold', () => {
      const { svc } = buildService({
        osModule: {
          totalmem: () => 100,
          freemem: () => 1, // used 99%
          uptime: () => 0,
          loadavg: () => [0],
          cpus: () => [{}, {}],
          arch: () => 'x64',
          platform: () => 'linux',
        },
      });
      const res = svc.checkMemHealth(0.95);
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });

    it('handles os error gracefully', () => {
      const { svc } = buildService({
        osModule: {
          totalmem: () => {
            throw new Error('oops');
          },
          freemem: () => 0,
          uptime: () => 0,
          loadavg: () => [0],
          cpus: () => [{}, {}],
          arch: () => 'x64',
          platform: () => 'linux',
        },
      });
      const res = svc.checkMemHealth();
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });
  });

  describe('checkDiskHealth', () => {
    it('returns OK when below threshold with formatted fields', async () => {
      const proc = makeSpawnSuccessDfK(1_000_000, 600_000); // used 40%
      const { svc } = buildService({
        bun: {
          spawn: () => proc,
          nanoseconds: () => 1,
        },
      });
      const res = await svc.checkDiskHealth(0.95);
      expect(res.status).toBe(HEALTH_STATE.OK);
      expect(res.usedPercent).toMatch(/%$/);
      expect(proc.killed).toBe(true);
    });

    it('returns ERROR at threshold edge', async () => {
      // used 95%
      const total = 1_000_000;
      const avail = 50_000;
      const proc = makeSpawnSuccessDfK(total, avail);
      const { svc } = buildService({
        bun: {
          spawn: () => proc,
          nanoseconds: () => 1,
        },
      });
      const res = await svc.checkDiskHealth(0.95);
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });

    it('returns ERROR above threshold', async () => {
      const total = 1_000_000;
      const avail = 10_000; // 99% used
      const proc = makeSpawnSuccessDfK(total, avail);
      const { svc } = buildService({
        bun: {
          spawn: () => proc,
          nanoseconds: () => 1,
        },
      });
      const res = await svc.checkDiskHealth(0.95);
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });

    it('propagates df command failure as ERROR', async () => {
      const proc = makeSpawnNonZero();
      const { svc } = buildService({
        bun: {
          spawn: () => proc,
          nanoseconds: () => 1n,
        },
      });
      const res = await svc.checkDiskHealth();
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });
  });

  describe('checkRedisHealth', () => {
    it('returns OK when set/get succeeds', async () => {
      const cache = createRedisMock();
      // ensure get resolves truthy
      cache.get = mock(async () => '1');
      const { svc } = buildService({ cache });
      const res = await svc.checkRedisHealth();
      expect(res.status).toBe(HEALTH_STATE.OK);
    });

    it('returns ERROR when get returns falsy', async () => {
      const cache = createRedisMock();
      // override get to simulate null
      cache.get = mock(async () => null);
      const { svc } = buildService({ cache });
      const res = await svc.checkRedisHealth();
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });

    it('returns ERROR when cache throws', async () => {
      const cache = createRedisMock();
      cache.set = mock(() => {
        throw new Error('redis down');
      });
      const { svc } = buildService({ cache });
      const res = await svc.checkRedisHealth();
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });
  });

  describe('checkDbHealth', () => {
    it('returns OK when query succeeds', async () => {
      const { svc } = buildService();
      const res = await svc.checkDbHealth();
      expect(res.status).toBe(HEALTH_STATE.OK);
    });

    it('returns ERROR when query fails', async () => {
      const prisma = createPrismaMock();
      prisma.$queryRaw = mock(() => {
        throw new Error('db down');
      });
      const { svc } = buildService({ db: prisma });
      const res = await svc.checkDbHealth();
      expect(res.status).toBe(HEALTH_STATE.ERROR);
    });
  });
});
