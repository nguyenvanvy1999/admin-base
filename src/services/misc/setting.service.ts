import { type ISettingCache, settingCache } from '@server/configs/cache';
import { type IDb, prisma } from '@server/configs/db';
import { EncryptService } from '@server/services/auth/encrypt.service';
import { type defaultSettings, SETTING } from '@server/share';
import { type Setting, SettingDataType } from 'src/generated';
import { z } from 'zod';

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type SettingDataTypeMap = {
  [SettingDataType.boolean]: boolean;
  [SettingDataType.number]: number;
  [SettingDataType.string]: string;
  [SettingDataType.date]: Date;
  [SettingDataType.json]: JSONValue;
};

type DefaultSettingsShape = typeof defaultSettings;

type SettingKeyTypes = {
  [K in keyof DefaultSettingsShape]: SettingDataTypeMap[DefaultSettingsShape[K]['type']];
};

export class SettingService {
  constructor(
    private readonly deps: {
      cache: ISettingCache;
      db: IDb;
      encrypt: EncryptService;
    } = { cache: settingCache, db: prisma, encrypt: new EncryptService() },
  ) {}

  getValue<T>(setting: Setting, raw = false): T {
    let value = setting.value;
    if (setting.isSecret) {
      value = this.deps.encrypt.aes256Decrypt(value);
    }
    if (raw) {
      return value as T;
    }
    switch (setting.type) {
      case SettingDataType.boolean:
        return (value === 'true') as T;
      case SettingDataType.number: {
        const numValue = Number(value);
        return (Number.isNaN(numValue) ? 0 : numValue) as T;
      }
      case SettingDataType.date: {
        const dateValue = new Date(value);
        return (
          Number.isNaN(dateValue.getTime()) ? new Date(0) : dateValue
        ) as T;
      }
      case SettingDataType.json: {
        return JSON.parse(value);
      }
      default:
        return value as T;
    }
  }

  checkValue(value: string, type: SettingDataType): boolean {
    const schemaMap = {
      boolean: z.union([z.literal('true'), z.literal('false')]),
      number: z.string().regex(/^-?\d+(\.\d+)?$/),
      string: z.string(),
      date: z.iso.datetime(),
      json: z.any(),
    } as const;
    return schemaMap[type].safeParse(value).success;
  }

  async getSetting<T>(key: string): Promise<T> {
    const cachedValue = await this.deps.cache.get(key);
    if (cachedValue != null) {
      return cachedValue as T;
    }
    const setting = await this.deps.db.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new Error(`Missing setting key ${key}`);
    }
    const value = this.getValue<T>(setting);
    await this.deps.cache.set(key, value);
    return value;
  }

  async getManySettings<const K extends readonly SETTING[]>(
    keys: K,
    opts?: { raw?: boolean },
  ): Promise<{ [I in keyof K]: SettingKeyTypes[K[I]] }> {
    if (keys.length === 0) {
      return [] as unknown as { [I in keyof K]: SettingKeyTypes[K[I]] };
    }

    const uniqueKeys = Array.from(new Set(keys)) as readonly SETTING[];
    const cacheHits = await this.deps.cache.getMany(
      uniqueKeys as unknown as string[],
    );

    const missingKeys: readonly SETTING[] = uniqueKeys.filter(
      (k) => !cacheHits.has(k),
    );
    const fromDb = missingKeys.length
      ? await this.deps.db.setting.findMany({
          where: { key: { in: missingKeys as unknown as string[] } },
        })
      : [];

    if (fromDb.length !== missingKeys.length) {
      const foundSet = new Set(fromDb.map((s) => s.key));
      const notFound = (missingKeys as readonly string[]).filter(
        (k) => !foundSet.has(k),
      );
      throw new Error(`Missing setting keys ${notFound.join(',')}`);
    }

    const parsed = new Map<string, unknown>();
    for (const k of uniqueKeys) {
      if (cacheHits.has(k)) {
        parsed.set(k, cacheHits.get(k));
      }
    }

    await Promise.all(
      fromDb.map(async (s) => {
        const v = this.getValue<unknown>(s, opts?.raw === true);
        parsed.set(s.key, v);
        await this.deps.cache.set(s.key, v as never);
      }),
    );

    return keys.map((k) => parsed.get(k as string)) as unknown as {
      [I in keyof K]: SettingKeyTypes[K[I]];
    };
  }

  async getManySettingsAsRecord<const K extends readonly SETTING[]>(
    keys: K,
    opts?: { raw?: boolean },
  ): Promise<{ [P in K[number]]: SettingKeyTypes[P] }> {
    if (keys.length === 0) {
      return {} as { [P in K[number]]: SettingKeyTypes[P] };
    }

    const values = await this.getManySettings(keys, opts);
    const record = {} as { [P in K[number]]: SettingKeyTypes[P] };
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i] as K[number];
      (record as Record<string, unknown>)[k] = values[i] as unknown;
    }
    return record;
  }

  async password(): Promise<{
    enbAttempt: boolean;
    enbExpired: boolean;
  }> {
    const [enbAttempt, enbExpired] = await Promise.all([
      this.getSetting<boolean>(SETTING.ENB_PASSWORD_ATTEMPT),
      this.getSetting<boolean>(SETTING.ENB_PASSWORD_EXPIRED),
    ]);
    return {
      enbAttempt,
      enbExpired,
    };
  }

  enbOnlyOneSession(): Promise<boolean> {
    return this.getSetting<boolean>(SETTING.ENB_ONLY_ONE_SESSION);
  }
}

export const settingService = new SettingService();
