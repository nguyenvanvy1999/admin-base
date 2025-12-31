import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { type ISettingCache, settingCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type { UpdateSettingParams } from 'src/dtos/settings.dto';
import type { Setting, SettingSelect } from 'src/generated';
import { AuditLogVisibility, SettingDataType } from 'src/generated';
import {
  type EncryptService,
  encryptService,
} from 'src/services/auth/encrypt.service';
import {
  BadReqErr,
  type defaultSettings,
  ErrCode,
  NotFoundErr,
  SETTING,
  ValueUtil,
} from 'src/share';
import { type AuditLogsService, auditLogsService } from '../audit-logs';

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

type SettingDependency = {
  key: string;
  condition: (value: unknown) => boolean;
  message?: string;
};

type SettingDependencies = {
  [key: string]: SettingDependency[];
};

export type ValidationRules = {
  min?: number;
  max?: number;
  pattern?: string | RegExp;
  custom?: (value: unknown) => boolean | string;
  message?: string;
};

export type ValidationRulesMap = {
  [key: string]: ValidationRules;
};

const settingSelect = {
  id: true,
  key: true,
  description: true,
  type: true,
  value: true,
  isSecret: true,
} satisfies SettingSelect;

export class SettingsService {
  constructor(
    private readonly deps: {
      db: IDb;
      cache: ISettingCache;
      auditLogService: AuditLogsService;
      encryptService: EncryptService;
    } = {
      db,
      cache: settingCache,
      auditLogService: auditLogsService,
      encryptService,
    },
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
      value = this.deps.encryptService.aes256Decrypt(value);
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

  validateSetting(
    key: string,
    value: string,
    type: SettingDataType,
    rules?: ValidationRules,
    isSecret?: boolean,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    let decryptedValue = value;
    if (isSecret) {
      try {
        decryptedValue = this.deps.encryptService.aes256Decrypt(value);
      } catch {
        decryptedValue = value;
      }
    }

    const schemaMap = {
      boolean: Type.Union([Type.Literal('true'), Type.Literal('false')]),
      number: Type.String({ pattern: '^-?\\d+(\\.\\d+)?$' }),
      string: Type.String(),
      date: Type.String({ format: 'date-time' }),
      json: Type.Any(),
    } as const;

    if (!Value.Check(schemaMap[type], decryptedValue)) {
      errors.push(`Invalid value type for setting ${key}: expected ${type}`);
      return { valid: false, errors };
    }

    const defaultRules: ValidationRulesMap = {
      [SETTING.REGISTER_OTP_LIMIT]: {
        min: 1,
        max: 100,
        message: `${SETTING.REGISTER_OTP_LIMIT} must be between 1 and 100`,
      },
    };

    const finalRules = rules || defaultRules[key];

    if (!finalRules) {
      return { valid: true, errors: [] };
    }

    let parsedValue: unknown;
    switch (type) {
      case SettingDataType.boolean:
        parsedValue = this.parseBoolean(decryptedValue);
        break;
      case SettingDataType.number:
        parsedValue = this.parseNumber(decryptedValue);
        break;
      case SettingDataType.date:
        parsedValue = this.parseDate(decryptedValue);
        break;
      case SettingDataType.json:
        parsedValue = this.parseJSON(decryptedValue);
        break;
      default:
        parsedValue = decryptedValue;
    }

    if (type === SettingDataType.number) {
      const numValue = parsedValue as number;
      if (finalRules.min !== undefined && numValue < finalRules.min) {
        errors.push(
          finalRules.message ||
            `Value for setting ${key} must be at least ${finalRules.min}`,
        );
      }
      if (finalRules.max !== undefined && numValue > finalRules.max) {
        errors.push(
          finalRules.message ||
            `Value for setting ${key} must be at most ${finalRules.max}`,
        );
      }
    }

    if (type === SettingDataType.string && finalRules.pattern) {
      const pattern =
        finalRules.pattern instanceof RegExp
          ? finalRules.pattern
          : new RegExp(finalRules.pattern);
      if (!pattern.test(decryptedValue)) {
        errors.push(
          finalRules.message ||
            `Value for setting ${key} does not match required pattern`,
        );
      }
    }

    if (finalRules.custom) {
      const result = finalRules.custom(parsedValue);
      if (result === false) {
        errors.push(
          finalRules.message ||
            `Value for setting ${key} failed custom validation`,
        );
      } else if (typeof result === 'string') {
        errors.push(result);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
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
    const [enbAttempt, enbExpired] = await this.getManySettings([
      SETTING.ENB_PASSWORD_ATTEMPT,
      SETTING.ENB_PASSWORD_EXPIRED,
    ]);
    return {
      enbAttempt,
      enbExpired,
    };
  }

  enbOnlyOneSession(): Promise<boolean> {
    return this.getSetting<boolean>(SETTING.ENB_ONLY_ONE_SESSION);
  }

  enbMfaRequired(): Promise<boolean> {
    return this.getSetting<boolean>(SETTING.ENB_MFA_REQUIRED);
  }

  enbIpWhitelist(): Promise<boolean> {
    return this.getSetting<boolean>(SETTING.ENB_IP_WHITELIST);
  }

  registerOtpLimit(): Promise<number> {
    return this.getSetting<number>(SETTING.REGISTER_OTP_LIMIT);
  }

  async loginSecurity(): Promise<{
    deviceRecognition: boolean;
    blockUnknownDevice: boolean;
    auditWarning: boolean;
  }> {
    const [deviceRecognition, blockUnknownDevice, auditWarning] =
      await this.getManySettings([
        SETTING.ENB_SECURITY_DEVICE_RECOGNITION,
        SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE,
        SETTING.ENB_SECURITY_AUDIT_WARNING,
      ]);

    return {
      deviceRecognition,
      blockUnknownDevice,
      auditWarning,
    };
  }

  validateDependencies(
    settings: Record<string, unknown>,
    dependencies?: SettingDependencies,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const defaultDependencies: SettingDependencies = {
      [SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE]: [
        {
          key: SETTING.ENB_SECURITY_DEVICE_RECOGNITION,
          condition: (value) => value === true,
          message: `${SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE} requires ${SETTING.ENB_SECURITY_DEVICE_RECOGNITION} to be enabled`,
        },
      ],
      [SETTING.ENB_PASSWORD_EXPIRED]: [
        {
          key: SETTING.ENB_PASSWORD_ATTEMPT,
          condition: (value) => value === true,
          message: `${SETTING.ENB_PASSWORD_EXPIRED} requires ${SETTING.ENB_PASSWORD_ATTEMPT} to be enabled`,
        },
      ],
    };

    const mergedDependencies = { ...defaultDependencies, ...dependencies };

    for (const settingKey of Object.keys(settings)) {
      const deps = mergedDependencies[settingKey];
      if (!deps || deps.length === 0) {
        continue;
      }

      for (const dep of deps) {
        const depValue = settings[dep.key];
        if (depValue === undefined) {
          errors.push(
            `Setting ${settingKey} depends on ${dep.key} which is missing`,
          );
          continue;
        }

        if (!dep.condition(depValue)) {
          errors.push(
            dep.message ||
              `Setting ${settingKey} has invalid dependency on ${dep.key}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async exportSettings(keys?: string[]): Promise<Record<string, string>> {
    const where = keys && keys.length > 0 ? { key: { in: keys } } : {};
    const settings = await this.deps.db.setting.findMany({ where });

    const result: Record<string, string> = {};
    for (const setting of settings) {
      let value = setting.value;
      if (setting.isSecret) {
        value = this.deps.encryptService.aes256Decrypt(value);
      }
      result[setting.key] = value;
    }

    return result;
  }

  async importSettings(
    data: Record<string, string>,
    opts?: {
      validate?: boolean;
      validateRules?: boolean;
      validateDependencies?: boolean;
      rulesMap?: ValidationRulesMap;
    },
  ): Promise<{
    imported: number;
    errors: string[];
    auditEntries: {
      id: string;
      key: string;
      beforeValue: string;
      afterValue: string;
      isSecret: boolean;
      description?: string | null;
    }[];
  }> {
    const errors: string[] = [];
    const keys = Object.keys(data);

    if (keys.length === 0) {
      return { imported: 0, errors: [], auditEntries: [] };
    }

    const existingSettings = await this.deps.db.setting.findMany({
      where: { key: { in: keys } },
    });

    if (opts?.validate !== false) {
      for (const [key, value] of Object.entries(data)) {
        const setting = existingSettings.find((s) => s.key === key);
        if (setting) {
          const validation = this.validateSetting(
            key,
            value,
            setting.type,
            undefined,
            setting.isSecret,
          );
          if (!validation.valid) {
            errors.push(...validation.errors);
          }
        } else {
          errors.push(`Setting ${key} does not exist in database`);
        }
      }
    }

    if (errors.length > 0) {
      return { imported: 0, errors, auditEntries: [] };
    }

    if (opts?.validateRules !== false) {
      for (const [key, value] of Object.entries(data)) {
        const setting = existingSettings.find((s) => s.key === key);
        if (setting) {
          const rules = opts?.rulesMap?.[key];
          const validation = this.validateSetting(
            key,
            value,
            setting.type,
            rules,
            setting.isSecret,
          );
          if (!validation.valid) {
            return { imported: 0, errors: validation.errors, auditEntries: [] };
          }
        }
      }
    }

    if (opts?.validateDependencies !== false) {
      const allSettings = await this.deps.db.setting.findMany();
      const settingsRecord: Record<string, unknown> = {};

      for (const setting of allSettings) {
        const importedValue = data[setting.key];
        if (importedValue !== undefined) {
          settingsRecord[setting.key] = this.getValue<unknown>({
            ...setting,
            value: importedValue,
          });
        } else {
          settingsRecord[setting.key] = this.getValue<unknown>(setting);
        }
      }

      const validation = this.validateDependencies(settingsRecord);
      if (!validation.valid) {
        return { imported: 0, errors: validation.errors, auditEntries: [] };
      }
    }

    const updates = existingSettings
      .filter((s) => data[s.key] !== undefined)
      .map((setting) => {
        let value = data[setting.key]!;
        if (setting.isSecret) {
          value = this.deps.encryptService.aes256Encrypt(value);
        }
        return {
          where: { key: setting.key },
          data: { value },
        };
      });

    await Promise.all(
      updates.map(async (update) => {
        await this.deps.db.setting.update({
          where: update.where,
          data: update.data,
        });
        await this.deps.cache.del(update.where.key);
      }),
    );

    const auditEntries = updates.map((update) => {
      const original = existingSettings.find(
        (item) => item.key === update.where.key,
      )!;
      const beforeValue = original.isSecret
        ? '***'
        : this.getValue<string>(original);
      const afterValue = original.isSecret
        ? '***'
        : this.getValue<string>({
            ...original,
            value: update.data.value!,
          });

      return {
        id: original.id,
        key: original.key,
        beforeValue,
        afterValue,
        isSecret: original.isSecret,
        description: original.description,
      };
    });

    return { imported: updates.length, errors: [], auditEntries };
  }

  async list() {
    const settings = await this.deps.db.setting.findMany({
      select: settingSelect,
    });
    return Promise.all(
      settings.map((x) => {
        const result = { ...x };
        if (x.isSecret) {
          result.value = '************';
        }
        return result;
      }),
    );
  }

  async update(params: UpdateSettingParams): Promise<{ id: string }> {
    const { id, value, isSecret, description } = params;
    const setting = await this.deps.db.setting.findUnique({
      where: { id },
      select: {
        value: true,
        type: true,
        key: true,
        isSecret: true,
        description: true,
      },
    });
    if (!setting) {
      throw new NotFoundErr(ErrCode.ItemNotFound);
    }
    if (!this.validateSetting(setting.key, value, setting.type).valid) {
      throw new BadReqErr(ErrCode.BadRequest);
    }
    const newValue = isSecret
      ? this.deps.encryptService.aes256Encrypt(value)
      : value;
    const previousValue = setting.isSecret
      ? '***'
      : this.getValue<string>({
          ...setting,
          value: setting.value,
        } as Setting);
    const updated = await this.deps.db.setting.update({
      where: { id },
      data: {
        value: newValue,
        isSecret,
        ...(description !== undefined && { description }),
      },
      select: settingSelect,
    });
    await this.deps.cache.set(updated.key, this.getValue(updated));

    const displayNewValue = isSecret ? '***' : this.getValue<string>(updated);

    await this.deps.auditLogService.pushCud(
      {
        category: 'cud',
        entityType: 'setting',
        entityId: id,
        action: 'update',
        changes: {
          value: { previous: previousValue, next: displayNewValue },
          description: {
            previous: setting.description,
            next: updated.description,
          },
          isSecret: { previous: setting.isSecret, next: updated.isSecret },
        },
      },
      { visibility: AuditLogVisibility.admin_only },
    );
    return { id: updated.id };
  }

  export() {
    return this.exportSettings();
  }

  async import(data: Record<string, string>) {
    const result = await this.importSettings(data);
    if (result.errors.length > 0) {
      throw new BadReqErr(ErrCode.BadRequest, { errors: result.errors });
    }

    if (result.auditEntries.length > 0) {
      await this.deps.auditLogService.pushBatch(
        result.auditEntries.map((entry) => ({
          type: 'cud' as const,
          payload: {
            category: 'cud',
            entityType: 'setting',
            entityId: entry.id,
            action: 'update',
            key: entry.key,
            description: entry.description,
            changes: {
              value: { previous: entry.beforeValue, next: entry.afterValue },
            },
          },
        })),
      );
    }
    return result;
  }
}

export const settingsService = new SettingsService();
