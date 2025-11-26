import TelegramBot, { type InputMedia } from 'node-telegram-bot-api';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import { EncryptService } from 'src/service/auth/encrypt.service';
import type { ITeleOptions } from 'src/share';

type BotFactory = (token: string) => TelegramBot;

export class TelegramService {
  constructor(
    private readonly deps: {
      readonly db: IDb;
      readonly logger: ILogger;
      readonly env: IEnv;
      readonly botFactory: BotFactory;
      readonly decryptToken?: (encrypted: string) => string;
    } = {
      db,
      logger,
      env,
      botFactory: (token: string) =>
        new TelegramBot(token, {
          polling: false,
          request: {
            url: 'https://api.telegram.org',
            agentOptions: {
              keepAlive: true,
              family: 4,
            },
          },
        }),
    },
  ) {}

  async internalSend(payload: {
    userId: TelegramBot.ChatId | TelegramBot.ChatId[];
    message: string;
    options?: ITeleOptions;
  }): Promise<void> {
    const { userId, message, options } = payload;
    const token = options?.botToken ?? this.deps.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.deps.logger.error('Telegram bot is not initialized');
      return;
    }
    const bot = this.deps.botFactory(token);
    let emojiMessage = '';
    if (options?.emoji) {
      switch (options.emoji) {
        case 'check':
          emojiMessage = `✅✅✅ ${message}`;
          break;
        case 'block':
          emojiMessage = `⛔⛔⛔ ${message}`;
          break;
        case 'refresh':
          emojiMessage = `♻️♻️♻️ ${message}`;
          break;
        case 'sos':
          emojiMessage = `🆘🆘🆘 ${message}`;
          break;
        default:
          emojiMessage = `${options.emoji} ${message}`;
      }
    }
    const userIds = Array.isArray(userId) ? userId : [userId];

    await Promise.allSettled(
      userIds.map(async (uid) => {
        try {
          if (options?.photos?.length === 1 && !options?.videos?.length) {
            const photo = options.photos[0];
            if (photo) {
              await bot.sendPhoto(uid, photo, {
                ...options,
                caption: emojiMessage,
              });
            }
            return;
          }

          if (options?.videos?.length === 1 && !options?.photos?.length) {
            const video = options.videos[0];
            if (video) {
              await bot.sendVideo(uid, video, {
                ...options,
                caption: emojiMessage,
              });
            }
            return;
          }

          const totalMediaCount =
            (options?.photos?.length ?? 0) + (options?.videos?.length ?? 0);
          if (totalMediaCount > 1) {
            await bot.sendMediaGroup(uid, [
              ...(options?.photos?.map((media) => ({
                type: 'photo' as const,
                media,
                parse_mode: 'HTML' as const,
                caption: emojiMessage,
              })) ?? []),
              ...(options?.videos?.map((media) => ({
                type: 'video' as const,
                media,
                parse_mode: 'HTML' as const,
                caption: emojiMessage,
              })) ?? []),
            ] satisfies InputMedia[]);
          }
          await bot.sendMessage(uid, emojiMessage, {
            parse_mode: 'HTML',
            reply_markup: options?.reply_markup,
          });
          this.deps.logger.info(`Send message to chat ID ${uid}`);
        } catch (error) {
          this.deps.logger.error(
            `Error sending message to chat ID ${uid}: ${error}`,
          );
        }
      }),
    );
  }

  async sendMessage(
    userId: TelegramBot.ChatId | TelegramBot.ChatId[],
    message: string,
    options?: ITeleOptions,
  ): Promise<void> {
    await this.internalSend({ userId, message, options });
  }

  async getBotToken(id: string | undefined): Promise<string | undefined> {
    if (!id) return;
    let botToken: string | undefined;
    if (id) {
      const bot = await this.deps.db.telegramBot.findUnique({
        where: { id },
        select: { token: true },
      });
      const decrypt = this.deps.decryptToken ?? EncryptService.aes256Decrypt;
      botToken = bot?.token ? decrypt(bot.token) : undefined;
    }
    return botToken;
  }
}

export const telegramService = new TelegramService();
