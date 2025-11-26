import type { IEnv } from 'src/config/env';
import { APP_ENV, LOG_LEVEL } from 'src/share';

export type MailEnv = Pick<
  IEnv,
  'MAIL_HOST' | 'MAIL_PORT' | 'MAIL_USER' | 'MAIL_PASSWORD' | 'MAIL_FROM'
>;

export const DEFAULT_TEST_ENV: Partial<IEnv> = {
  APP_ENV: APP_ENV.DEV,
  APP_NAME: 'test-app',
  PORT: 3000,
  ENB_HTTP_LOG: true,
  REQ_BODY_MAX_SIZE_MB: 256,
  REQ_TIMEOUT_SECOND: 10,
  ENB_SEED: false,
  ENB_WARM_CACHE: false,
  ENB_CLUSTER: false,
  API_PREFIX: 'api',
  COMMIT_HASH: 'test-hash',
  BUILD_DATE: Math.floor(Date.now() / 1000),
  BUILD_NUMBER: '1',
  POSTGRESQL_URI: 'postgresql://test:test@localhost:5432/test_db',
  REDIS_URI: 'redis://localhost:6379',
  REDIS_RETRY: 5,
  JWT_AUDIENCE: 'https://example.com',
  JWT_ISSUER: 'admin',
  JWT_SUBJECT: 'admin',
  JWT_ACCESS_TOKEN_SECRET_KEY: 'test-secret',
  JWT_ACCESS_TOKEN_EXPIRED: '15 minutes',
  JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION: '0 second',
  JWT_REFRESH_TOKEN_EXPIRED: '15 days',
  SYSTEM_PASSWORD: 'test-system-password',
  ADMIN_PASSWORD: 'test-admin-password',
  SALT_LENGTH: 10,
  PASSWORD_MAX_ATTEMPT: 5,
  PASSWORD_PEPPER: 'test-pepper',
  PASSWORD_EXPIRED: '180 days',
  ENCRYPT_KEY:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
  S3_ENDPOINT: undefined,
  S3_BUCKET: undefined,
  S3_REGION: undefined,
  S3_ACCESS_KEY: undefined,
  S3_SECRET_KEY: undefined,
  ENB_BULL_BOARD: true,
  ENB_SWAGGER_UI: true,
  AUTHOR_NAME: 'AUTHOR_NAME',
  AUTHOR_URL: 'https://example.com',
  AUTHOR_EMAIL: 'example@gmail.com',
  LICENSE_NAME: 'Apache 2.0',
  LICENSE_URL: 'https://www.apache.org/licenses/LICENSE-2.0',
  LOG_LEVEL: LOG_LEVEL.INFO,
  MAIL_HOST: 'smtp.test.com',
  MAIL_PORT: 465,
  MAIL_USER: 'test@test.com',
  MAIL_PASSWORD: 'test-password',
  MAIL_FROM: 'noreply@test.com',
  BACKEND_URL: '',
  REGISTER_OTP_LIMIT: 5,
  AUDIT_LOG_FLUSH_INTERVAL_MS: 10000,
};

export function createMockMailEnv(overrides: Partial<MailEnv> = {}): MailEnv {
  return {
    MAIL_HOST: 'smtp.mock.local',
    MAIL_PORT: 465 as unknown as number,
    MAIL_USER: 'user@mock.local',
    MAIL_PASSWORD: 'password',
    MAIL_FROM: 'noreply@mock.local',
    ...overrides,
  } as MailEnv;
}

export function createMockFullEnv(overrides: Partial<IEnv> = {}): IEnv {
  return {
    ...DEFAULT_TEST_ENV,
    ...overrides,
  } as IEnv;
}
