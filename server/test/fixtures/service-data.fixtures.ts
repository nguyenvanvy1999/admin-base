import type { Setting, SettingDataType } from 'src/generated';
import { ACTIVITY_TYPE, LOG_LEVEL, PurposeVerify } from 'src/share';

export class AuditLogFixtures {
  static createEntry(overrides: Record<string, any> = {}) {
    return {
      type: ACTIVITY_TYPE.LOGIN,
      payload: { action: 'login' },
      ...overrides,
    };
  }

  static createFullEntry(overrides: Record<string, any> = {}) {
    return {
      userId: 'user-123',
      sessionId: 'session-456',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      type: ACTIVITY_TYPE.LOGIN,
      payload: { action: 'login', timestamp: new Date() },
      level: LOG_LEVEL.INFO,
      timestamp: new Date('2023-01-01T00:00:00Z'),
      requestId: 'req-789',
      traceId: 'trace-101',
      correlationId: 'corr-202',
      ...overrides,
    };
  }
}

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

export class OtpFixtures {
  static createOtpData(overrides: Record<string, any> = {}) {
    return {
      otpId: 'test-otp-id',
      purpose: PurposeVerify.REGISTER,
      userId: 'user-123',
      email: 'test@example.com',
      ...overrides,
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

export class CurrencyCacheFixtures {
  static createTestScenarios() {
    return {
      // Common test data
      currencyId: 'currency-1',
      networkId: 'network-1',
      code: 'BTC',
      type: 'CRYPTO',

      // Test IDs for batch operations
      batchIds: ['currency-1', 'currency-2', 'currency-3'],
      partialBatchIds: ['currency-1', 'currency-2'],

      // Filter scenarios
      filterByType: { type: 'CRYPTO' },
      filterByNetwork: { networkId: 'network-1' },
      filterByCode: { code: 'BTC' },
      multipleFilters: { type: 'CRYPTO', networkId: 'network-1', code: 'BTC' },
    };
  }
}
