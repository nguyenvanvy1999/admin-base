import { mock } from 'bun:test';

export interface BullmqMock {
  Queue: ReturnType<typeof mock>;
  Worker: ReturnType<typeof mock>;
  QueueScheduler: ReturnType<typeof mock>;
}

export function createBullmqMock(): BullmqMock {
  const Queue = mock((name: string, opts: any) => ({
    // public fields commonly accessed by code/tests
    name,
    opts,
    // job api (subset used in tests/services)
    add: mock(async () => undefined),
    addBulk: mock(async (jobs?: unknown[]) => jobs ?? []),
    getWaiting: mock(async () => []),
    getJobs: mock(async () => []),
    getJob: mock(async () => null),
    remove: mock(async () => undefined),
    close: mock(async () => undefined),
    pause: mock(async () => undefined),
    resume: mock(async () => undefined),
  }));

  const Worker = mock((_queueName: string, _proc: any, _opts?: any) => ({
    on: mock(() => undefined),
    close: mock(async () => undefined),
    pause: mock(async () => undefined),
    resume: mock(async () => undefined),
  }));

  const QueueScheduler = mock((_queueName: string, _opts?: any) => ({
    close: mock(async () => undefined),
  }));

  return { Queue, Worker, QueueScheduler };
}

export const bullmqMock: BullmqMock = createBullmqMock();

export interface QueueInstanceMock {
  add: ReturnType<typeof mock>;
  addBulk: ReturnType<typeof mock>;
  getWaiting: ReturnType<typeof mock>;
  getJobs: ReturnType<typeof mock>;
  getJob: ReturnType<typeof mock>;
  remove: ReturnType<typeof mock>;
  close: ReturnType<typeof mock>;
  pause: ReturnType<typeof mock>;
  resume: ReturnType<typeof mock>;
  name: string;
  opts: unknown;
}
