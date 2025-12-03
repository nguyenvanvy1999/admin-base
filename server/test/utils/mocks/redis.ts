import { mock } from 'bun:test';

export function createRedisMock() {
  return {
    close: mock(async (_err: unknown) => void 0),
    isOpen: true,
    connect: mock(async () => undefined),
    subscribe: mock(async (): Promise<null | undefined> => undefined),
    psubscribe: mock(async () => undefined),
    unsubscribe: mock(async (): Promise<null | undefined> => undefined),
    publish: mock(async () => 1),
    get: mock(async (): Promise<string | null> => null),
    mget: mock(async (_keys: string[]): Promise<Array<string | null>> => []),
    set: mock(async () => 'OK'),
    setex: mock(async () => 'OK'),
    del: mock(async () => 0),
    quit: mock(async () => undefined),
    smembers: mock(async (): Promise<Array<any>> => []),
    sadd: mock(async () => 1),
    srem: mock(async () => 0),
    exists: mock(async () => 0),
    hset: mock(async () => 1),
    expire: mock(async () => 1),
    send: mock(
      async (cmd: string, _args?: any[]): Promise<any> =>
        cmd === 'EVAL' ? 1 : 'OK',
    ),
    on: mock(() => undefined),
    emit: mock(() => true),
  };
}

export const redisMock = createRedisMock();

export type RedisMock = ReturnType<typeof createRedisMock>;
