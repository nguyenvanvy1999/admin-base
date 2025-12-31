import type { Setting, SettingDataType } from 'src/generated';

export class SettingFixtures {
  static createSetting(
    key: string,
    value: string,
    type: SettingDataType,
    isSecret = false,
  ): Setting {
    return {
      id: `setting_${key}`,
      key,
      value,
      type,
      isSecret,
      description: `Test setting for ${key}`,
    };
  }
}

export class LockFixtures {
  static createLockData(overrides: Record<string, any> = {}) {
    return {
      key: 'test-resource',
      ttl: 10,
      lockValue: '1234567890-0.123456789',
      ...overrides,
    };
  }
}

export class IdempotencyFixtures {
  static createIdempotencyData(overrides: Record<string, any> = {}) {
    return {
      key: 'test-key',
      ttl: 3600,
      ...overrides,
    };
  }
}
