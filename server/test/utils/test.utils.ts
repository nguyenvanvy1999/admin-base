import { DEFAULT_TEST_ENV } from './mocks/env';

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
