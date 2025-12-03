import { logger } from 'src/config/logger';
import { redisPub, redisSub } from 'src/config/pubsub';

export const wsMap = new Map<string, { send: (message: string) => unknown }>();
const CHAT_ROOM_CHANNEL = 'chat:rooms';

type RoomBroadcast = {
  roomId: string;
  payload: unknown;
};

type RoomEventHandler = (event: RoomBroadcast) => Promise<void> | void;

let roomEventHandler: RoomEventHandler | null = null;

export const registerRoomEventHandler = (handler: RoomEventHandler): void => {
  roomEventHandler = handler;
};

export async function subscribeInbox(): Promise<void> {
  try {
    await redisSub.subscribe(
      CHAT_ROOM_CHANNEL,
      async (message: string, _channel: string) => {
        try {
          const parsed = JSON.parse(message) as RoomBroadcast;
          if (!parsed?.roomId) return;
          await roomEventHandler?.(parsed);
        } catch (err) {
          logger.error(`WS room-channel invalid message: ${String(err)}`);
        }
      },
    );
    logger.info(`WS subscribed channel: ${CHAT_ROOM_CHANNEL}`);
  } catch (err) {
    logger.error(`WS subscribe error: ${String(err)}`);
  }
}

export async function publishToRoom(
  roomId: string,
  payload: unknown,
): Promise<void> {
  await redisPub.publish(
    CHAT_ROOM_CHANNEL,
    JSON.stringify({ roomId, payload }),
  );
}

export function stopWsInfra(): void {
  wsMap.clear();
  roomEventHandler = null;
}
