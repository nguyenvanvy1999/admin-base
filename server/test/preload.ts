import { mock } from 'bun:test';
import type Elysia from 'elysia';
import { TestSetup } from './utils';
import { bullmqMock } from './utils/mocks/bullmq';
import { createMockLogger } from './utils/mocks/logger';
import { redisMock } from './utils/mocks/redis';

mock.module('bullmq', () => ({
  Queue: bullmqMock.Queue,
  Worker: bullmqMock.Worker,
  QueueScheduler: bullmqMock.QueueScheduler,
}));

mock.module('bun', () => ({
  RedisClient: mock(() => redisMock),
}));

mock.module('src/config/pubsub', () => ({
  redisPub: { ...redisMock },
  redisSub: { ...redisMock },
}));

mock.module('src/config/redis', () => ({
  redis: redisMock,
}));

const mockLogger = createMockLogger();
const mockHttpLogger = createMockLogger();
const mockSlowReqLogger = createMockLogger();

mock.module('src/config/logger', () => ({
  logger: mockLogger,
  httpLogger: mockHttpLogger,
  slowReqLogger: mockSlowReqLogger,
}));

mock.module('src/service/misc/graceful-shutdown.service', () => ({
  gracefulShutdownService: {
    setupShutdownHandlers: mock(() => undefined),
  },
}));

mock.module('src/config/bull-board', () => ({
  bullBoardConfig: () => (app: Elysia) => app,
}));

mock.module('src/config/ws-pubsub', () => ({
  subscribeInbox: mock(async () => undefined),
  wsMap: new Map(),
  publishToRoom: mock(async () => undefined),
  stopWsInfra: mock(() => undefined),
  registerRoomEventHandler: mock(() => undefined),
}));

TestSetup.setup();
