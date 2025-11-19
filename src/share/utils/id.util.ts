import { init } from '@paralleldrive/cuid2';
import { DiscordSnowflake } from '@sapphire/snowflake';

export enum DB_PREFIX {
  SESSION = 'session',
  USER = 'user',
  PERMISSION = 'perm',
  ROLE = 'role',
  SETTING = 'setting',
  AUTH_PROVIDER = 'auth_prov',
  ACCOUNT = 'acc',
  TRANSACTION = 'txn',
  TAG = 'tag',
  EVENT = 'event',
  ENTITY = 'entity',
  BUDGET = 'budget',
  INVESTMENT = 'invest',
  TRADE = 'trade',
  CONTRIBUTION = 'contrib',
  VALUATION = 'val',
  BUDGET_PERIOD = 'budget_period',
  GOAL = 'goal',
}

export class IdUtil {
  private readonly i16 = init({ length: 16 });
  private readonly i12 = init({ length: 12 });
  private readonly i32 = init({ length: 32 });
  private readonly i8 = init({ length: 8 });

  token12(prefix = ''): string {
    const id = this.i12();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  token8(prefix = ''): string {
    const id = this.i8();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  token16(prefix = ''): string {
    const id = this.i16();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  dbId(prefix?: DB_PREFIX): string {
    const id = this.i16();
    return prefix ? `${prefix}_${id}` : id;
  }

  dbIdWithUserId(prefix: DB_PREFIX, userId: string): string {
    const id = this.i16();
    return `${prefix}_${id}_${userId}`;
  }

  extractUserIdFromId(resourceId: string): string | null {
    const parts = resourceId.split('_');
    if (parts.length < 3) {
      return null;
    }
    // Format: prefix_unique_userId
    // userId is the last part
    return parts[parts.length - 1] ?? null;
  }

  token32(prefix = ''): string {
    const id = this.i32();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  snowflakeId(): bigint {
    return DiscordSnowflake.generate();
  }
}
export const idUtil = new IdUtil();
