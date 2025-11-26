import { DEFAULT_TEST_ENV } from './mocks/env';

export const TEST_CONFIG = {
  // Test environment variables
  ENV: {
    ENCRYPT_KEY: DEFAULT_TEST_ENV.ENCRYPT_KEY!,
    ENCRYPT_IV: DEFAULT_TEST_ENV.ENCRYPT_IV!,
    NODE_ENV: 'test',
  },

  // Test timeouts
  TIMEOUT: {
    DEFAULT: 5000,
    LONG: 10000,
    SHORT: 1000,
  },

  // Test data
  DATA: {
    SAMPLE_STRING: 'Hello World',
    SAMPLE_OBJECT: { name: 'Test', value: 123 },
    SAMPLE_ARRAY: [1, 2, 3, 4, 5],
    SAMPLE_NUMBER: 42,
    SAMPLE_DECIMAL: '123.456',
    SAMPLE_AMOUNT: '100.50',
  },
} as const;

export class TestSetup {
  static setup(): void {
    const minimalEnvVars: Record<string, string | number> = {
      ENCRYPT_KEY: DEFAULT_TEST_ENV.ENCRYPT_KEY!,
      ENCRYPT_IV: DEFAULT_TEST_ENV.ENCRYPT_IV!,
      NODE_ENV: 'test',
      APP_NAME: DEFAULT_TEST_ENV.APP_NAME!,
      COMMIT_HASH: DEFAULT_TEST_ENV.COMMIT_HASH!,
      BUILD_DATE: DEFAULT_TEST_ENV.BUILD_DATE!,
      BUILD_NUMBER: DEFAULT_TEST_ENV.BUILD_NUMBER!,
      POSTGRESQL_URI: DEFAULT_TEST_ENV.POSTGRESQL_URI!,
      JWT_ACCESS_TOKEN_SECRET_KEY:
        DEFAULT_TEST_ENV.JWT_ACCESS_TOKEN_SECRET_KEY!,
      SYSTEM_PASSWORD: DEFAULT_TEST_ENV.SYSTEM_PASSWORD!,
      ADMIN_PASSWORD: DEFAULT_TEST_ENV.ADMIN_PASSWORD!,
      PASSWORD_PEPPER: DEFAULT_TEST_ENV.PASSWORD_PEPPER!,
      MAIL_HOST: DEFAULT_TEST_ENV.MAIL_HOST!,
      MAIL_USER: DEFAULT_TEST_ENV.MAIL_USER!,
      MAIL_PASSWORD: DEFAULT_TEST_ENV.MAIL_PASSWORD!,
      MAIL_FROM: DEFAULT_TEST_ENV.MAIL_FROM!,
    };

    for (const [key, value] of Object.entries(minimalEnvVars)) {
      if (!process.env[key]) {
        process.env[key] = String(value);
      }
    }

    if (
      !process.env['CORS_ALLOW_METHOD'] ||
      !/^[A-Z,]+$/.test(process.env['CORS_ALLOW_METHOD'])
    ) {
      process.env['CORS_ALLOW_METHOD'] =
        'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD';
    }
  }
}

export class TestDataGenerator {
  static generateString(length = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateDate(): Date {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
  }
}

export class TestAssertions {
  static assertIsBase64(value: string): void {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(value)) {
      throw new Error(`Expected a valid base64 string, but got: ${value}`);
    }
  }
}
