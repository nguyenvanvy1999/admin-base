import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  mock,
} from 'bun:test';
import { env } from 'src/config/env';
import { TestLifecycle } from 'test/utils';
import type { RedisMock } from 'test/utils/mocks/redis';

const TEST_CHANNEL = 'test-channel';
const TEST_MESSAGE = JSON.stringify({ type: 'test', data: 'hello' });
const TEST_ROOM_ID = 'room-123';
const TEST_INSTANCE_ID = 'instance-456';

let pubSpies: RedisMock;
let subSpies: RedisMock;

describe('src/config/pubsub.ts', () => {
  beforeAll(() => {
    const client = {
      publish: mock(async (_c: string, _m: string) => 1),
      subscribe: mock(
        async (_c: string, _cb?: (m: string, ch: string) => void) => undefined,
      ),
      unsubscribe: mock(async (_c?: string, _listener?: any) => undefined),
      smembers: mock(async (_k: string) => [] as string[]),
      sadd: mock(async (_k: string, ..._m: string[]) => 1),
      srem: mock(async (_k: string, ..._m: string[]) => 1),
      exists: mock(async (_k: string) => 0),
      del: mock(async (_k: string) => 1),
      hset: mock(async (_k: string, ..._args: any[]) => 1),
      expire: mock(async (_k: string, _seconds: number) => 1),
      onclose: undefined as ((err: Error | null) => void) | undefined,
      onconnect: undefined as (() => void) | undefined,
      close: mock(async () => undefined),
    };
    mock.module('bun', () => ({
      RedisClient: mock(() => ({ ...client })),
    }));
    env.REDIS_URI = 'redis://localhost:6379';
  });

  beforeEach(async () => {
    const mod = await import('src/config/pubsub');
    pubSpies = mod.redisPub as unknown as RedisMock;
    subSpies = mod.redisSub as unknown as RedisMock;

    pubSpies.publish.mockResolvedValue(1);
    subSpies.subscribe.mockResolvedValue(null);
    subSpies.unsubscribe.mockResolvedValue(null);
    pubSpies.smembers.mockResolvedValue([]);
    pubSpies.sadd.mockResolvedValue(1);
    pubSpies.srem.mockResolvedValue(1);
    pubSpies.exists.mockResolvedValue(0);
    pubSpies.del.mockResolvedValue(1);
    pubSpies.hset.mockResolvedValue(1);
    pubSpies.expire.mockResolvedValue(1);
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  describe('Module Exports & Initialization', () => {
    it('should export redisPub and redisSub clients', async () => {
      const mod = await import('src/config/pubsub');
      expect(mod.redisPub).toBeDefined();
      expect(mod.redisSub).toBeDefined();
    });

    it('should create separate instances for redisPub and redisSub', async () => {
      const mod = await import('src/config/pubsub');
      expect(mod.redisPub).not.toBe(mod.redisSub);
    });

    it('should create clients with correct Redis URI', async () => {
      const mod = await import('src/config/pubsub');
      expect(mod.redisPub).toBeDefined();
      expect(mod.redisSub).toBeDefined();
      expect(env.REDIS_URI).toBe('redis://localhost:6379');
    });

    it('should test type safety with expectTypeOf', async () => {
      const mod = await import('src/config/pubsub');
      expectTypeOf(mod.redisPub).toBeObject();
      expectTypeOf(mod.redisSub).toBeObject();
    });
  });

  describe('Connection Handling', () => {
    it('should support onclose callback for redisPub', async () => {
      const mod = await import('src/config/pubsub');
      const client = mod.redisPub;

      expect(client).toBeDefined();
      expect(
        client.onclose === undefined || typeof client.onclose === 'function',
      ).toBe(true);
    });

    it('should support onclose callback for redisSub', async () => {
      const mod = await import('src/config/pubsub');
      const client = mod.redisSub;

      expect(client).toBeDefined();
      expect(
        client.onclose === undefined || typeof client.onclose === 'function',
      ).toBe(true);
    });

    it('should allow setting onclose handler for redisPub', async () => {
      const mod = await import('src/config/pubsub');
      const client = mod.redisPub;

      const errorHandler = (_err: Error | null) => {
        // Mock error handler
      };
      client.onclose = errorHandler;
      expect(client.onclose).toBe(errorHandler);
    });

    it('should allow setting onclose handler for redisSub', async () => {
      const mod = await import('src/config/pubsub');
      const client = mod.redisSub;

      const errorHandler = (_err: Error | null) => {
        // Mock error handler
      };
      client.onclose = errorHandler;
      expect(client.onclose).toBe(errorHandler);
    });

    it('should verify clients are defined', async () => {
      const mod = await import('src/config/pubsub');
      expect(mod.redisPub).toBeDefined();
      expect(mod.redisSub).toBeDefined();
    });

    it('should have close method available', async () => {
      const mod = await import('src/config/pubsub');

      expect(typeof mod.redisPub.close).toBe('function');
      expect(typeof mod.redisSub.close).toBe('function');
    });
  });

  describe('Pub/Sub Operations', () => {
    it('should publish messages to a channel', async () => {
      const mod = await import('src/config/pubsub');
      await mod.redisPub.publish(TEST_CHANNEL, TEST_MESSAGE);

      expect(pubSpies.publish).toHaveBeenCalledTimes(1);
      expect(pubSpies.publish).toHaveBeenCalledWith(TEST_CHANNEL, TEST_MESSAGE);
    });

    it('should subscribe to a channel with callback', async () => {
      const mod = await import('src/config/pubsub');
      const callback = (message: string, channel: string) => {
        expect(message).toBeDefined();
        expect(channel).toBeDefined();
      };

      await mod.redisSub.subscribe(TEST_CHANNEL, callback);

      expect(subSpies.subscribe).toHaveBeenCalledTimes(1);
      expect(subSpies.subscribe).toHaveBeenCalledWith(TEST_CHANNEL, callback);
    });

    it('should handle multiple subscriptions to the same channel', async () => {
      const mod = await import('src/config/pubsub');
      const callback1 = (_message: string, _channel: string) => {
        // Mock callback 1
      };
      const callback2 = (_message: string, _channel: string) => {
        // Mock callback 2
      };

      await mod.redisSub.subscribe(TEST_CHANNEL, callback1);
      await mod.redisSub.subscribe(TEST_CHANNEL, callback2);

      expect(subSpies.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe from a channel', async () => {
      const mod = await import('src/config/pubsub');
      await mod.redisSub.unsubscribe(TEST_CHANNEL);

      expect(subSpies.unsubscribe).toHaveBeenCalledTimes(1);
      expect(subSpies.unsubscribe).toHaveBeenCalledWith(TEST_CHANNEL);
    });

    it('should handle unsubscribe without arguments', async () => {
      const mod = await import('src/config/pubsub');
      await mod.redisSub.unsubscribe();

      expect(subSpies.unsubscribe).toHaveBeenCalledTimes(1);
      expect(subSpies.unsubscribe).toHaveBeenCalledWith();
    });

    it('should handle JSON message serialization', async () => {
      const mod = await import('src/config/pubsub');
      const payload = { type: 'chat', userId: 123, message: 'Hello' };
      const serialized = JSON.stringify(payload);

      await mod.redisPub.publish(TEST_CHANNEL, serialized);

      expect(pubSpies.publish).toHaveBeenCalledWith(TEST_CHANNEL, serialized);
    });

    it.each([
      { channel: 'channel-1', message: JSON.stringify({ id: 1 }) },
      { channel: 'channel-2', message: JSON.stringify({ id: 2 }) },
      { channel: 'channel-3', message: JSON.stringify({ id: 3 }) },
    ])('should handle multiple channels %channel', async ({
      channel,
      message,
    }) => {
      const mod = await import('src/config/pubsub');
      await mod.redisPub.publish(channel, message);

      expect(pubSpies.publish).toHaveBeenCalledWith(channel, message);
    });
  });

  describe('Redis Operations Used in Chat Module', () => {
    it('should get set members with sMembers', async () => {
      const mod = await import('src/config/pubsub');
      const key = `room:${TEST_ROOM_ID}:instances`;
      pubSpies.smembers.mockResolvedValueOnce(['inst1', 'inst2']);

      const members = await mod.redisPub.smembers(key);

      expect(pubSpies.smembers).toHaveBeenCalledWith(key);
      expect(members).toEqual(['inst1', 'inst2']);
    });

    it('should remove set members with sRem', async () => {
      const mod = await import('src/config/pubsub');
      const key = `room:${TEST_ROOM_ID}:instances`;
      const member = TEST_INSTANCE_ID;

      await mod.redisPub.srem(key, member);

      expect(pubSpies.srem).toHaveBeenCalledWith(key, member);
    });

    it('should check key existence with exists', async () => {
      const mod = await import('src/config/pubsub');
      const key = `instance:${TEST_INSTANCE_ID}:alive`;
      pubSpies.exists.mockResolvedValueOnce(1);

      const exists = await mod.redisPub.exists(key);

      expect(pubSpies.exists).toHaveBeenCalledWith(key);
      expect(exists).toBeGreaterThanOrEqual(0);
      expect(typeof exists).toBe('number');
    });

    it('should delete keys with del', async () => {
      const mod = await import('src/config/pubsub');
      const key = `room:${TEST_ROOM_ID}:connections:${TEST_INSTANCE_ID}`;

      await mod.redisPub.del(key);

      expect(pubSpies.del).toHaveBeenCalledWith(key);
    });

    it('should handle empty set members', async () => {
      const mod = await import('src/config/pubsub');
      const key = 'empty-room:instances';
      pubSpies.smembers.mockResolvedValueOnce([]);

      const members = await mod.redisPub.smembers(key);

      expect(members).toEqual([]);
      expect(pubSpies.smembers).toHaveBeenCalledWith(key);
    });

    it('should handle non-existent keys', async () => {
      const mod = await import('src/config/pubsub');
      const key = 'non-existent:key';
      pubSpies.exists.mockResolvedValueOnce(0);

      const exists = await mod.redisPub.exists(key);

      expect(typeof exists).toBe('number');
      expect(exists).toBeGreaterThanOrEqual(0);
    });

    it.each([
      { key: 'room:1:instances', members: ['inst1', 'inst2'] },
      { key: 'room:2:instances', members: ['inst3'] },
      { key: 'room:3:instances', members: [] },
    ] as {
      key: string;
      members: string[];
    }[])('should handle various room configurations %key', async ({
      key,
      members,
    }) => {
      const mod = await import('src/config/pubsub');
      pubSpies.smembers.mockResolvedValueOnce(members);

      const result = await mod.redisPub.smembers(key);

      expect(result).toEqual(members);
    });
  });

  describe('Error & Edge Cases', () => {
    it('should handle publish errors gracefully', async () => {
      const mod = await import('src/config/pubsub');
      const error = new Error('Publish failed');
      pubSpies.publish.mockRejectedValueOnce(error);

      expect(mod.redisPub.publish(TEST_CHANNEL, TEST_MESSAGE)).rejects.toThrow(
        'Publish failed',
      );
    });

    it('should handle subscribe errors gracefully', async () => {
      const mod = await import('src/config/pubsub');
      const error = new Error('Subscribe failed');
      subSpies.subscribe.mockRejectedValueOnce(error);

      expect(
        mod.redisSub.subscribe(TEST_CHANNEL, () => void 0),
      ).rejects.toThrow('Subscribe failed');
    });

    it('should handle malformed JSON in messages', async () => {
      const mod = await import('src/config/pubsub');
      const malformedMessage = '{ invalid json }';

      await mod.redisPub.publish(TEST_CHANNEL, malformedMessage);

      expect(pubSpies.publish).toHaveBeenCalledWith(
        TEST_CHANNEL,
        malformedMessage,
      );
    });

    it('should handle empty channel names', async () => {
      const mod = await import('src/config/pubsub');
      const emptyChannel = '';

      await mod.redisPub.publish(emptyChannel, TEST_MESSAGE);

      expect(pubSpies.publish).toHaveBeenCalledWith(emptyChannel, TEST_MESSAGE);
    });

    it('should handle empty messages', async () => {
      const mod = await import('src/config/pubsub');
      const emptyMessage = '';

      await mod.redisPub.publish(TEST_CHANNEL, emptyMessage);

      expect(pubSpies.publish).toHaveBeenCalledWith(TEST_CHANNEL, emptyMessage);
    });

    it('should handle large messages', async () => {
      const mod = await import('src/config/pubsub');
      const largeMessage = JSON.stringify({
        data: Array.from({ length: 10000 }, (_, i) => i),
      });

      await mod.redisPub.publish(TEST_CHANNEL, largeMessage);

      expect(pubSpies.publish).toHaveBeenCalledWith(TEST_CHANNEL, largeMessage);
    });

    it('should handle concurrent publish operations', async () => {
      const mod = await import('src/config/pubsub');
      const promises = Array.from({ length: 10 }, (_, i) =>
        mod.redisPub.publish(`channel-${i}`, `message-${i}`),
      );

      await Promise.all(promises);

      expect(pubSpies.publish).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent subscribe operations', async () => {
      const mod = await import('src/config/pubsub');
      const promises = Array.from({ length: 5 }, (_, i) =>
        mod.redisSub.subscribe(`channel-${i}`, () => void 0),
      );

      await Promise.all(promises);

      expect(subSpies.subscribe).toHaveBeenCalledTimes(5);
    });

    it('should handle sRem with multiple members', async () => {
      const mod = await import('src/config/pubsub');
      const key = 'test-set';
      const members = ['member1', 'member2', 'member3'];

      await mod.redisPub.srem(key, ...members);

      expect(pubSpies.srem).toHaveBeenCalledWith(key, ...members);
    });

    it('should handle special characters in channel names', async () => {
      const mod = await import('src/config/pubsub');
      const specialChannel = 'test:channel:with:colons';

      await mod.redisPub.publish(specialChannel, TEST_MESSAGE);

      expect(pubSpies.publish).toHaveBeenCalledWith(
        specialChannel,
        TEST_MESSAGE,
      );
    });
  });

  describe('Integration with WebSocket Chat Pattern', () => {
    it('should simulate typical ws-pubsub workflow', async () => {
      const mod = await import('src/config/pubsub');
      const instanceId = 'instance-123';
      const roomId = 'room-456';
      const connId = 'conn-789';
      const inboxChannel = `instance:${instanceId}:inbox`;

      pubSpies.smembers.mockResolvedValueOnce([instanceId]);
      pubSpies.exists.mockResolvedValueOnce(1);
      pubSpies.smembers.mockResolvedValueOnce([connId]);

      const instances = await mod.redisPub.smembers(`room:${roomId}:instances`);
      expect(instances).toContain(instanceId);

      const alive = await mod.redisPub.exists(`instance:${instanceId}:alive`);
      expect(alive).toBeGreaterThan(0);

      const conns = await mod.redisPub.smembers(
        `room:${roomId}:connections:${instanceId}`,
      );
      expect(conns).toContain(connId);

      const payload = { type: 'message', data: 'Hello room' };
      await mod.redisPub.publish(
        inboxChannel,
        JSON.stringify({ payload, targets: conns }),
      );

      expect(pubSpies.publish).toHaveBeenCalledWith(
        inboxChannel,
        expect.stringContaining('Hello room'),
      );
    });

    it('should handle room cleanup when no connections', async () => {
      const mod = await import('src/config/pubsub');
      const roomId = 'empty-room';
      const instanceId = 'instance-cleanup';

      pubSpies.smembers.mockResolvedValueOnce([]);

      const conns = await mod.redisPub.smembers(
        `room:${roomId}:connections:${instanceId}`,
      );
      expect(conns).toEqual([]);

      await mod.redisPub.srem(`room:${roomId}:instances`, instanceId);
      await mod.redisPub.del(`room:${roomId}:connections:${instanceId}`);

      expect(pubSpies.srem).toHaveBeenCalled();
      expect(pubSpies.del).toHaveBeenCalled();
    });

    it('should handle dead instance cleanup', async () => {
      const mod = await import('src/config/pubsub');
      const roomId = 'room-with-dead-instance';
      const deadInstance = 'dead-instance';

      pubSpies.smembers.mockResolvedValueOnce([deadInstance]);
      pubSpies.exists.mockResolvedValueOnce(0);

      const instances = await mod.redisPub.smembers(`room:${roomId}:instances`);
      expect(instances).toContain(deadInstance);

      const alive = await mod.redisPub.exists(`instance:${deadInstance}:alive`);
      if (!alive) {
        await mod.redisPub.srem(`room:${roomId}:instances`, deadInstance);
      }

      expect(pubSpies.srem).toHaveBeenCalledWith(
        `room:${roomId}:instances`,
        deadInstance,
      );
    });

    it('should handle subscription with message processing callback', async () => {
      const mod = await import('src/config/pubsub');
      const instanceId = 'instance-subscriber';
      const inboxChannel = `instance:${instanceId}:inbox`;
      let receivedMessage: any = null;

      const callback = (message: string, channel: string) => {
        expect(channel).toBe(inboxChannel);
        try {
          receivedMessage = JSON.parse(message);
        } catch {
          receivedMessage = null;
        }
      };

      await mod.redisSub.subscribe(inboxChannel, callback);

      expect(subSpies.subscribe).toHaveBeenCalledWith(inboxChannel, callback);

      const testMessage = JSON.stringify({
        payload: { type: 'test' },
        targets: ['conn1'],
      });
      callback(testMessage, inboxChannel);

      expect(receivedMessage).toEqual({
        payload: { type: 'test' },
        targets: ['conn1'],
      });
    });

    it('should handle multiple rooms with different instances', async () => {
      const mod = await import('src/config/pubsub');
      const rooms = [
        { roomId: 'room1', instances: ['inst1', 'inst2'] },
        { roomId: 'room2', instances: ['inst3'] },
        { roomId: 'room3', instances: ['inst1', 'inst4'] },
      ];

      for (const room of rooms) {
        pubSpies.smembers.mockResolvedValueOnce(room.instances);
        const instances = await mod.redisPub.smembers(
          `room:${room.roomId}:instances`,
        );
        expect(instances).toEqual(room.instances);
      }

      expect(pubSpies.smembers).toHaveBeenCalledTimes(3);
    });
  });

  describe('Advanced Pub/Sub Patterns', () => {
    it('should handle unsubscribe from all channels', async () => {
      const mod = await import('src/config/pubsub');

      await mod.redisSub.unsubscribe();

      expect(subSpies.unsubscribe).toHaveBeenCalledWith();
    });

    it('should handle publish to non-existent channels', async () => {
      const mod = await import('src/config/pubsub');
      pubSpies.publish.mockResolvedValueOnce(0);

      const result = await mod.redisPub.publish(
        'non-existent-channel',
        'message',
      );

      expect(result).toBe(0);
      expect(pubSpies.publish).toHaveBeenCalled();
    });

    it('should handle rapid subscribe/unsubscribe cycles', async () => {
      const mod = await import('src/config/pubsub');
      const channel = 'dynamic-channel';

      await mod.redisSub.subscribe(channel, (_m: string, _c: string) => void 0);
      await mod.redisSub.unsubscribe(channel);
      await mod.redisSub.subscribe(channel, (_m: string, _c: string) => void 0);
      await mod.redisSub.unsubscribe(channel);

      expect(subSpies.subscribe).toHaveBeenCalledTimes(2);
      expect(subSpies.unsubscribe).toHaveBeenCalledTimes(2);
    });

    it('should handle message batching scenario', async () => {
      const mod = await import('src/config/pubsub');
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        content: `Message ${i}`,
      }));

      for (const msg of messages) {
        await mod.redisPub.publish(TEST_CHANNEL, JSON.stringify(msg));
      }

      expect(pubSpies.publish).toHaveBeenCalledTimes(100);
    });
  });

  describe('Type Safety and Structure', () => {
    it('should maintain type structure for Redis clients', async () => {
      const mod = await import('src/config/pubsub');

      expect(typeof mod.redisPub.publish).toBe('function');
      expect(typeof mod.redisSub.subscribe).toBe('function');
      expect(typeof mod.redisPub.smembers).toBe('function');
      expect(typeof mod.redisPub.exists).toBe('function');
    });

    it('should support method chaining where applicable', async () => {
      const mod = await import('src/config/pubsub');

      expect(mod.redisPub).toBeDefined();
      expect(mod.redisSub).toBeDefined();
    });

    it('should verify all required pub/sub methods exist', async () => {
      const mod = await import('src/config/pubsub');

      const requiredPubMethods = [
        'publish',
        'smembers',
        'sadd',
        'srem',
        'exists',
        'del',
        'hset',
        'expire',
      ];
      const requiredSubMethods = ['subscribe', 'unsubscribe'];

      for (const method of requiredPubMethods) {
        expect(mod.redisPub).toHaveProperty(method);
      }

      for (const method of requiredSubMethods) {
        expect(mod.redisSub).toHaveProperty(method);
      }
    });
  });
});
