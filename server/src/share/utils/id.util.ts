import { init } from '@paralleldrive/cuid2';
import { DiscordSnowflake } from '@sapphire/snowflake';
import type { DB_PREFIX } from 'src/share/constant';

export class IdUtil {
  private static readonly i16 = init({ length: 16 });
  private static readonly i12 = init({ length: 12 });
  private static readonly i32 = init({ length: 32 });
  private static readonly i8 = init({ length: 8 });

  static token12(prefix = ''): string {
    const id = IdUtil.i12();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  static token8(prefix = ''): string {
    const id = IdUtil.i8();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  static generateP2PUsername(): string {
    return `user_${IdUtil.i8()}`;
  }

  static token16(prefix = ''): string {
    const id = IdUtil.i16();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  static dbId(prefix?: DB_PREFIX): string {
    const id = IdUtil.i16();
    return prefix ? `${prefix}_${id}` : id;
  }

  static token32(prefix = ''): string {
    const id = IdUtil.i32();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  static snowflakeId(): bigint {
    return DiscordSnowflake.generate();
  }
}
