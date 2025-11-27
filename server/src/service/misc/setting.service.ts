import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { type ISettingCache, settingCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import { type Setting, SettingDataType } from 'src/generated';
import { EncryptService } from 'src/service/auth/encrypt.service';
import { type defaultSettings, SETTING, ValueUtil } from 'src/share';

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
    } = { cache: settingCache, db: db },
  ) {}

  private parseBoolean(value: string): boolean {
    return value === 'true';
  }

  private parseNumber(value: string): number {
    const numValue = Number(value);
    return Number.isNaN(numValue) ? 0 : numValue;
  }

  private parseDate(value: string): Date {
    const dateValue = new Date(value);
    return Number.isNaN(dateValue.getTime()) ? new Date(0) : dateValue;
  }

  private parseJSON<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  getValue<T>(setting: Setting, raw = false): T {
    let value = setting.value;
    if (setting.isSecret) {
      value = EncryptService.aes256Decrypt(value);
    }
    if (raw) {
      return value as T;
    }
    switch (setting.type) {
      case SettingDataType.boolean:
        return this.parseBoolean(value) as T;
      case SettingDataType.number:
        return this.parseNumber(value) as T;
      case SettingDataType.date:
        return this.parseDate(value) as T;
      case SettingDataType.json:
        return this.parseJSON<T>(value);
      default:
        return value as T;
    }
  }

  checkValue(value: string, type: SettingDataType): boolean {
    const schemaMap = {
      boolean: Type.Union([Type.Literal('true'), Type.Literal('false')]),
      number: Type.String({ pattern: '^-?\\d+(\\.\\d+)?$' }),
      string: Type.String(),
      date: Type.String({ format: 'date-time' }),
      json: Type.Any(),
    } as const;
    return Value.Check(schemaMap[type], value);
  }

  async getSetting<T>(key: string): Promise<T> {
    const cachedValue = await this.deps.cache.get(key);
    if (ValueUtil.notNil(cachedValue)) {
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
        const cached = cacheHits.get(k);
        if (cached !== undefined) {
          parsed.set(k, cached);
        }
      }
    }

    await Promise.all(
      fromDb.map(async (s) => {
        const v = this.getValue<unknown>(s, opts?.raw === true);
        parsed.set(s.key, v);
        await this.deps.cache.set(s.key, v as never);
      }),
    );

    const result = keys.map((k) => {
      const value = parsed.get(k);
      if (value === undefined) {
        throw new Error(`Setting value not found for key: ${k}`);
      }
      return value;
    });

    return result as unknown as { [I in keyof K]: SettingKeyTypes[K[I]] };
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
      const k = keys[i];
      if (k) {
        (record as Record<string, unknown>)[k] = values[i];
      }
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

  async registerRateLimit(): Promise<{
    otpLimit: number;
    max: number;
    windowSeconds: number;
  }> {
    const [otpLimit, max, windowSeconds] = await Promise.all([
      this.getSetting<number>(SETTING.REGISTER_OTP_LIMIT),
      this.getSetting<number>(SETTING.REGISTER_RATE_LIMIT_MAX),
      this.getSetting<number>(SETTING.REGISTER_RATE_LIMIT_WINDOW_SECONDS),
    ]);
    return {
      otpLimit,
      max,
      windowSeconds,
    };
  }

  async loginRateLimit(): Promise<{
    max: number;
    windowSeconds: number;
  }> {
    const [max, windowSeconds] = await Promise.all([
      this.getSetting<number>(SETTING.LOGIN_RATE_LIMIT_MAX),
      this.getSetting<number>(SETTING.LOGIN_RATE_LIMIT_WINDOW_SECONDS),
    ]);
    return {
      max,
      windowSeconds,
    };
  }
}

export const settingService = new SettingService();
