import { mock } from 'bun:test';

type Fn = ReturnType<typeof mock>;

export interface PrismaMockClient {
  $transaction: Fn;
  $connect: Fn;
  $disconnect: Fn;
  $on: Fn;
  $queryRaw: Fn;
  // Dynamic models; index signature for ease in tests
  [model: string]: any;
}

function createModel() {
  return {
    findUnique: mock(async () => null),
    findFirst: mock(async () => null),
    findMany: mock(async () => []),
    create: mock(async (x: unknown) => x),
    createMany: mock(async () => ({ count: 0 })),
    update: mock(async (x: unknown) => x),
    updateMany: mock(async () => ({ count: 0 })),
    upsert: mock(async (x: unknown) => x),
    delete: mock(async () => null),
    deleteMany: mock(async () => ({ count: 0 })),
    count: mock(async () => 0),
    aggregate: mock(async () => ({})),
  };
}

export function createPrismaMock(): PrismaMockClient {
  const models: PrismaMockClient = {
    $transaction: mock((cb: unknown) => {
      if (typeof cb === 'function')
        return (cb as (tx: unknown) => unknown)(models);
      return cb;
    }),
    $connect: mock(async () => undefined),
    $disconnect: mock(async () => undefined),
    $on: mock(() => undefined),
    $queryRaw: mock(async () => ({ rows: [] })),
    user: createModel(),
    account: createModel(),
    accountSnapshot: createModel(),
    transaction: createModel(),
    ledgerJournal: createModel(),
    order: createModel(),
    dispute: createModel(),
    currency: createModel(),
    network: createModel(),
    role: createModel(),
    permission: createModel(),
    rolePermission: createModel(),
    referral: createModel(),
    setting: createModel(),
    authProvider: createModel(),
    telegramBot: createModel(),
  };

  return models;
}
