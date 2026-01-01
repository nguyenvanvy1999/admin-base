import { init } from '@paralleldrive/cuid2';
import { DiscordSnowflake } from '@sapphire/snowflake';
import type { DB_PREFIX } from 'src/share/constants';

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

  token32(prefix = ''): string {
    const id = this.i32();
    return prefix.length ? `${prefix}_${id}` : id;
  }

  snowflakeId(): bigint {
    return DiscordSnowflake.generate();
  }
}

export const idUtil = new IdUtil();
